import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="icon"
      {...props}
    >
      {children}
    </svg>
  );
}

export const UserIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
  </Svg>
);
export const NewsIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 8h4v4H7zM14 8h3m-3 4h3M7 16h10" />
  </Svg>
);
export const MicIcon = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8" />
  </Svg>
);
export const CameraIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 8h4l2-3h6l2 3h4v11H3z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
);
export const FrameIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="1" />
    <rect x="7" y="8" width="10" height="8" />
  </Svg>
);
export const GradIcon = (p: P) => (
  <Svg {...p}>
    <path d="m2 9 10-5 10 5-10 5-10-5zm4 2v6q6 5 12 0v-6m4-2v7" />
  </Svg>
);
export const AwardIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="5" />
    <path d="m8 12-2 9 6-3 6 3-2-9" />
  </Svg>
);
export const FolderIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 7V5h6l2 2h10v3M3 7h8l2 3h9l-3 10H3z" />
  </Svg>
);
export const ChevronIcon = (p: P) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);
export const ArrowLeftIcon = (p: P) => (
  <Svg {...p}>
    <path d="M19 12H5m6-6-6 6 6 6" />
  </Svg>
);
export const ArrowUpRightIcon = (p: P) => (
  <Svg {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </Svg>
);
export const ArrowUpIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 19V5m-6 6 6-6 6 6" />
  </Svg>
);
export const TrophyIcon = (p: P) => (
  <Svg {...p}>
    <path d="M7 3h10v7a5 5 0 0 1-10 0V3zM7 5H3v2a4 4 0 0 0 4 4m10-6h4v2a4 4 0 0 1-4 4m-5 4v5m-4 0h8" />
  </Svg>
);
export const CheckFileIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 3h9l5 5v13H5zM14 3v5h5m-11 7 3 3 5-6" />
  </Svg>
);
export const MailIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 6 9 7 9-7" />
  </Svg>
);
export const LinkedinIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 10v7m0-10h.01M11 17v-7m0 3a3 3 0 0 1 6 0v4" />
  </Svg>
);
export const UsersIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M2 20v-2a7 7 0 0 1 14 0v2m1-15a3 3 0 0 1 0 6m1 3a6 6 0 0 1 4 6" />
  </Svg>
);
export const SendIcon = (p: P) => (
  <Svg {...p}>
    <path d="m21 3-9 18-2-8-8-2z" />
    <path d="m21 3-11 10" />
  </Svg>
);
export const InstagramIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.5 6.5h.01" />
  </Svg>
);
export const GlobeIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </Svg>
);
export const PhoneIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 3h4l2 5-3 2a11 11 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" />
  </Svg>
);
export const LinkIcon = (p: P) => (
  <Svg {...p}>
    <path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1m2 4a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" />
  </Svg>
);
export const FileIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 3h9l5 5v13H5zM14 3v5h5M8 12h8m-8 4h8" />
  </Svg>
);
export const DownloadIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
  </Svg>
);
export const CloseIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const MenuIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 8h16M4 16h16" />
  </Svg>
);
export const PrevIcon = (p: P) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
);

export function CategoryIcon({ index }: { index: number }) {
  switch (index % 4) {
    case 1:
      return <MicIcon />;
    case 2:
      return <CameraIcon />;
    case 3:
      return <FrameIcon />;
    default:
      return <NewsIcon />;
  }
}

export function ContactIcon({ type }: { type: string }) {
  switch (type) {
    case "email":
      return <MailIcon />;
    case "linkedin":
      return <LinkedinIcon />;
    case "remember":
      return <UsersIcon />;
    case "telegram":
      return <SendIcon />;
    case "instagram":
      return <InstagramIcon />;
    case "website":
      return <GlobeIcon />;
    case "phone":
      return <PhoneIcon />;
    default:
      return <LinkIcon />;
  }
}
