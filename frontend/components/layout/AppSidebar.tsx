'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import {
  IconPlus,
  IconSettings,
  IconUpload,
  IconSun,
  IconMoon,
  IconMessage,
  IconTrash,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chatStore';

interface AppSidebarProps {
  children: React.ReactNode;
  onUploadClick?: () => void;
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function AppSidebar({ children, onUploadClick }: AppSidebarProps) {
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  
  const conversations = useChatStore((state) => state.conversations);
  const conversationId = useChatStore((state) => state.conversationId);
  const newConversation = useChatStore((state) => state.newConversation);
  const loadConversation = useChatStore((state) => state.loadConversation);
  const deleteConversation = useChatStore((state) => state.deleteConversation);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored) {
      setIsDark(stored === 'dark');
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleNewChat = () => {
    newConversation();
  };

  const handleLoadChat = (id: string) => {
    loadConversation(id);
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      deleteConversation(id);
    }
  };



  return (
    <div
      className={cn(
        'flex w-full flex-1 flex-col overflow-hidden md:flex-row bg-background',
        'h-screen'
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-6 border-r border-border/50 bg-card/50">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            
            {/* New Chat Button */}
            <div className="mt-6">
              <button
                onClick={handleNewChat}
                className={cn(
                  'flex items-center gap-2 w-full py-2 px-1 rounded-lg',
                  'text-primary hover:bg-primary/10 transition-colors'
                )}
              >
                <IconPlus className="h-5 w-5 shrink-0" />
                {open && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm font-medium whitespace-pre"
                  >
                    New Chat
                  </motion.span>
                )}
              </button>
            </div>

            {/* Past Chats */}
            {open && conversations.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6"
              >
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                  Recent Chats
                </p>
                <div className="space-y-1">
                  <AnimatePresence>
                    {conversations.slice(0, 10).map((conv) => (
                      <motion.button
                        key={conv.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        onClick={() => handleLoadChat(conv.id)}
                        className={cn(
                          'flex items-center gap-2 w-full py-2 px-2 rounded-lg text-left group',
                          'hover:bg-secondary/50 transition-colors',
                          conv.id === conversationId && 'bg-secondary/70'
                        )}
                      >
                        <IconMessage className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">
                            {conv.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(conv.updatedAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteChat(e, conv.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </button>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Collapsed state - just show icon for chats */}
            {!open && conversations.length > 0 && (
              <div className="mt-4 flex flex-col items-center gap-1">
                {conversations.slice(0, 5).map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleLoadChat(conv.id)}
                    className={cn(
                      'p-2 rounded-lg hover:bg-secondary/50 transition-colors',
                      conv.id === conversationId && 'bg-secondary/70'
                    )}
                    title={conv.title}
                  >
                    <IconMessage className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isDark ? (
                <IconSun className="h-5 w-5 shrink-0" />
              ) : (
                <IconMoon className="h-5 w-5 shrink-0" />
              )}
              {open && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm whitespace-pre"
                >
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </motion.span>
              )}
            </button>
            
            {/* Upload Button */}
            <button
              onClick={onUploadClick}
              className="flex items-center gap-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconUpload className="h-5 w-5 shrink-0" />
              {open && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm whitespace-pre"
                >
                  Upload PDF
                </motion.span>
              )}
            </button>
            
            {/* Settings */}
            <SidebarLink
              link={{
                label: 'Settings',
                href: '/settings',
                icon: (
                  <IconSettings className="h-5 w-5 shrink-0 text-muted-foreground" />
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}

const Logo = () => {
  return (
    <Link
      href="/"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal"
    >
      <div className="h-6 w-6 shrink-0 rounded-lg bg-primary flex items-center justify-center">
        <span className="text-primary-foreground text-xs font-bold">D</span>
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold whitespace-pre text-foreground"
      >
        DocSense
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      href="/"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal"
    >
      <div className="h-6 w-6 shrink-0 rounded-lg bg-primary flex items-center justify-center">
        <span className="text-primary-foreground text-xs font-bold">D</span>
      </div>
    </Link>
  );
};
