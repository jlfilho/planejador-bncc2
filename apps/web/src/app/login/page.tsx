'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ShieldCheck,
  Sparkles,
  Pencil,
  Lock,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { Button, Input, Alert } from '../../components/ui';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redireciona se já estiver autenticado
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/planos');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Por favor, informe o e-mail e a senha.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      router.push('/planos');
    } catch {
      setErrorMessage(
        'E-mail ou senha incorretos. Confira os dados e tente novamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseDemoAccount = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(demoEmail, demoPass);
      router.push('/planos');
    } catch {
      setErrorMessage(
        'E-mail ou senha incorretos. Confira os dados e tente novamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Painel Institucional (Esquerda) */}
      <section className={styles.institutionalPanel}>
        <div className={styles.institutionalTop}>
          <div className={styles.institutionalBrand}>
            <div className={styles.brandLogo}>
              <BookOpen size={24} />
            </div>
            <span className={styles.brandName}>Planejador BNCC</span>
          </div>

          <div className={styles.proposal}>
            <h1 className={styles.mainHeading}>
              Planejamento pedagógico com você no controle.
            </h1>
            <p className={styles.subHeading}>
              Selecione habilidades da BNCC, organize sua intenção pedagógica e
              gere um primeiro rascunho para revisar com autonomia.
            </p>
          </div>

          <div className={styles.guarantees}>
            <div className={styles.guaranteeItem}>
              <div className={styles.guaranteeIconWrapper}>
                <ShieldCheck size={18} />
              </div>
              <span className={styles.guaranteeText}>
                Rascunhos privados por padrão
              </span>
            </div>
            <div className={styles.guaranteeItem}>
              <div className={styles.guaranteeIconWrapper}>
                <Sparkles size={18} />
              </div>
              <span className={styles.guaranteeText}>
                Auxílio por IA sempre identificado
              </span>
            </div>
            <div className={styles.guaranteeItem}>
              <div className={styles.guaranteeIconWrapper}>
                <Pencil size={18} />
              </div>
              <span className={styles.guaranteeText}>
                Você revisa e decide o que salvar
              </span>
            </div>
          </div>
        </div>

        <p className={styles.institutionalFooter}>
          Ambiente demonstrativo · Sem cadastro público · Acesso restrito a
          contas autorizadas.
        </p>
      </section>

      {/* Área de Acesso (Direita) */}
      <main className={styles.accessArea}>
        <header className={styles.accessHeader}>
          <div className={styles.accessBrand}>
            <div className={styles.accessSymbol}>
              <BookOpen size={20} />
            </div>
            <div className={styles.accessBrandInfo}>
              <span className={styles.accessBrandTitle}>Planejador BNCC</span>
              <span className={styles.accessBrandSubtitle}>
                CONTROLE DOCENTE
              </span>
            </div>
          </div>

          <div className={styles.privacyBadge}>
            <Lock size={15} />
            <span>Acesso seguro</span>
          </div>
        </header>

        <div className={styles.formCard}>
          <div className={styles.formIntro}>
            <h2 className={styles.formTitle}>Entrar</h2>
            <p className={styles.formSubtitle}>
              Use uma das contas de demonstração para acessar seus rascunhos.
            </p>
          </div>

          {errorMessage && (
            <Alert
              variant="error"
              title="Não foi possível entrar"
              customIcon={<AlertCircle size={20} />}
            >
              {errorMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ana.souza@escola.gov.br"
              leftIcon={<Mail size={17} />}
              required
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock size={17} />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className={styles.submitButton}
              isLoading={isSubmitting}
            >
              Entrar
            </Button>
          </form>

          <div className={styles.demoAccountsSection}>
            <span className={styles.demoTitle}>Contas de demonstração</span>

            <div className={styles.demoCard}>
              <div className={styles.demoCardInfo}>
                <span className={styles.demoCardName}>Profª Ana Souza</span>
                <span className={styles.demoCardDetails}>
                  ana.souza@escola.gov.br · demo123
                </span>
              </div>
              <button
                type="button"
                className={styles.demoCardButton}
                onClick={() =>
                  handleUseDemoAccount(
                    'ana.souza@escola.gov.br',
                    process.env.NEXT_PUBLIC_DEMO_ANA_PASSWORD || 'senha-demo-ana',
                  )
                }
              >
                Usar conta
              </button>
            </div>

            <div className={styles.demoCard}>
              <div className={styles.demoCardInfo}>
                <span className={styles.demoCardName}>Prof. Marcos Lima</span>
                <span className={styles.demoCardDetails}>
                  marcos.lima@escola.gov.br · demo123
                </span>
              </div>
              <button
                type="button"
                className={styles.demoCardButton}
                onClick={() =>
                  handleUseDemoAccount(
                    'marcos.lima@escola.gov.br',
                    process.env.NEXT_PUBLIC_DEMO_MARCOS_PASSWORD ||
                      'senha-demo-marcos',
                  )
                }
              >
                Usar conta
              </button>
            </div>
          </div>

          <p className={styles.formDisclaimer}>
            Não há cadastro público. O acesso é disponibilizado somente por
            convite da demonstração.
          </p>
        </div>

        <footer className={styles.accessFooter}>
          Problemas para acessar? Fale com a equipe responsável pela
          demonstração.
        </footer>
      </main>
    </div>
  );
}
