import type { IconSvgElement } from '@hugeicons/react';
import type { ElementType } from 'react';

export interface NavItem {
  id: string;
  title: string;
  icon?: IconSvgElement;
  url?: string;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
}

export interface User {
  name: string;
  email: string;
  avatar: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  color: string;
  icon: IconSvgElement
}

export interface TeamItem {
  id: string;
  title: string;
  icon: ElementType;
}

export interface TopicItem {
  id: string;
  title: string;
  icon: ElementType;
}

export interface SidebarData {
  user: User;
  navMain: NavItem[];
  navCollapsible: {
    projects: ProjectItem[];
    teams: TeamItem[];
    topics: TopicItem[];
  };
}
