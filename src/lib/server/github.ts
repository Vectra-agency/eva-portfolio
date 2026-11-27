import "server-only";

const API = "https://api.github.com";

export function githubConfig() {
  return {
    token: process.env.GITHUB_TOKEN ?? "",
    repo: process.env.GITHUB_REPO ?? "",
    branch: process.env.GITHUB_BRANCH || "main",
  };
}

export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function gh(path: string, init: RequestInit & { accept?: string } = {}): Promise<Response> {
  const { token, repo } = githubConfig();
  const res = await fetch(`${API}/repos/${repo}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: init.accept ?? "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "portfolio-admin",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { message?: string }).message ?? "";
    } catch {}
    throw new GitHubError(`GitHub ${init.method ?? "GET"} ${path}: ${res.status} ${detail}`, res.status);
  }
  return res;
}

async function ghJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await gh(path, init)).json() as Promise<T>;
}

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

/** Raw bytes of a file at the tip of the branch. */
export async function getRawFile(path: string): Promise<ArrayBuffer> {
  const { branch } = githubConfig();
  const res = await gh(`/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`, {
    accept: "application/vnd.github.raw+json",
  });
  return res.arrayBuffer();
}

/** Raw bytes of a blob that may not be committed yet. */
export async function getBlob(sha: string): Promise<ArrayBuffer> {
  const res = await gh(`/git/blobs/${encodeURIComponent(sha)}`, {
    accept: "application/vnd.github.raw+json",
  });
  return res.arrayBuffer();
}

/** Stores bytes in the repo's object database without committing; returns the blob sha. */
export async function createBlob(bytes: Buffer): Promise<string> {
  const out = await ghJson<{ sha: string }>(`/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content: bytes.toString("base64"), encoding: "base64" }),
  });
  return out.sha;
}

export type TreeChange =
  | { path: string; content: string }
  | { path: string; sha: string }
  | { path: string; delete: true };

/**
 * One commit on top of the branch tip: writes, adds already-uploaded blobs and
 * deletes files. `plan` sees the current file list so it can decide what to delete.
 */
export async function commitChanges(
  message: string,
  plan: (existingPaths: string[]) => TreeChange[],
): Promise<string> {
  const { branch } = githubConfig();
  const refPath = `/git/ref/heads/${encodeURIComponent(branch)}`;

  for (let attempt = 0; ; attempt++) {
    const ref = await ghJson<{ object: { sha: string } }>(refPath);
    const head = ref.object.sha;
    const commit = await ghJson<{ tree: { sha: string } }>(`/git/commits/${head}`);
    const tree = await ghJson<{ tree: { path: string; type: string }[] }>(
      `/git/trees/${commit.tree.sha}?recursive=1`,
    );
    const existing = tree.tree.filter((e) => e.type === "blob").map((e) => e.path);

    const entries = plan(existing).map((c) => {
      if ("content" in c) return { path: c.path, mode: "100644", type: "blob", content: c.content };
      if ("sha" in c) return { path: c.path, mode: "100644", type: "blob", sha: c.sha };
      return { path: c.path, mode: "100644", type: "blob", sha: null };
    });

    const newTree = await ghJson<{ sha: string }>(`/git/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: commit.tree.sha, tree: entries }),
    });
    const newCommit = await ghJson<{ sha: string }>(`/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message, tree: newTree.sha, parents: [head] }),
    });
    try {
      await gh(`/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: newCommit.sha, force: false }),
      });
      return newCommit.sha;
    } catch (e) {
      // Someone pushed in between: rebuild on the new tip once.
      if (attempt === 0 && e instanceof GitHubError && e.status === 422) continue;
      throw e;
    }
  }
}
