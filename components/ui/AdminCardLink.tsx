import Link from "next/link";
import type { ReactNode } from "react";
import {
  adminCardDescriptionStyle,
  adminCardGridStyle,
  adminCardStyle,
  adminCardTitleStyle,
} from "@/components/ui/layoutStyles";

type AdminCardGridProps = {
  children: ReactNode;
};

type AdminCardLinkProps = {
  href: string;
  title: ReactNode;
  description: ReactNode;
};

export function AdminCardGrid({ children }: AdminCardGridProps) {
  return <div style={adminCardGridStyle}>{children}</div>;
}

export function AdminCardLink({
  href,
  title,
  description,
}: AdminCardLinkProps) {
  return (
    <Link href={href} style={adminCardStyle}>
      <div style={adminCardTitleStyle}>{title}</div>
      <div style={adminCardDescriptionStyle}>{description}</div>
    </Link>
  );
}
