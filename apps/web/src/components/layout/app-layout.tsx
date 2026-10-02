'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  Files,
  FilePlus2,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import styles from './app-layout.module.css';

export interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumb?: string;
  pageTitle?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  breadcrumb,
  pageTitle,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redireciona para o login se não autenticado
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'PR';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Carregando sua sessão...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isMeusPlanos = pathname === '/planos' || pathname.startsWith('/planos/') && pathname !== '/planos/novo';
  const isNovoPlano = pathname === '/planos/novo';

  return (
    <div className={styles.wrapper}>
      {/* Mobile Top Navbar with Hamburger */}
      <header className={styles.mobileHeader}>
        <div className={styles.brandSmall}>
          <div className={styles.symbolSmall}>
            <BookOpen size={18} />
          </div>
          <span className={styles.brandTitleSmall}>Planejador BNCC</span>
        </div>
        <button
          className={styles.hamburgerButton}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside
        className={`${styles.sidebar} ${
          mobileMenuOpen ? styles.sidebarOpen : ''
        }`}
      >
        <div className={styles.sidebarTop}>
          <Link href="/planos" className={styles.brand}>
            <div className={styles.symbol}>
              <BookOpen size={20} />
            </div>
            <div className={styles.brandInfo}>
              <span className={styles.brandTitle}>Planejador BNCC</span>
              <span className={styles.brandSubtitle}>CONTROLE DOCENTE</span>
            </div>
          </Link>

          <nav className={styles.navMenu}>
            <Link
              href="/planos"
              onClick={() => setMobileMenuOpen(false)}
              className={`${styles.navItem} ${isMeusPlanos && !isNovoPlano ? styles.active : ''}`}
            >
              <Files size={18} />
              <span>Meus planos</span>
            </Link>
            <Link
              href="/planos/novo"
              onClick={() => setMobileMenuOpen(false)}
              className={`${styles.navItem} ${isNovoPlano ? styles.active : ''}`}
            >
              <FilePlus2 size={18} />
              <span>Novo plano</span>
            </Link>
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          <div className={styles.privacyCard}>
            <ShieldCheck size={18} className={styles.privacyIcon} />
            <p className={styles.privacyText}>
              Seus rascunhos são privados e visíveis somente para você.
            </p>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className={styles.mobileBackdrop}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Container */}
      <div className={styles.mainContainer}>
        {/* Topbar Desktop */}
        <header className={styles.topbar}>
          <div className={styles.contextContainer}>
            {breadcrumb && <span className={styles.breadcrumb}>{breadcrumb}</span>}
            <h2 className={styles.pageTitleHeading}>
              {pageTitle || 'Meus planos'}
            </h2>
          </div>

          <div className={styles.accountContainer}>
            <div className={styles.identity}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userRole}>
                {user?.role === 'DOCENTE' ? 'Docente' : user?.role || 'Docente'}
              </span>
            </div>
            <div className={styles.avatar} title={user?.name}>
              {getInitials(user?.name)}
            </div>
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
              title="Encerrar sessão"
              aria-label="Encerrar sessão"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className={styles.contentArea}>{children}</main>
      </div>
    </div>
  );
};
