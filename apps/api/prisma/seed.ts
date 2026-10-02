import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed idempotente do Planejador BNCC...');

  // 1. Contas de Demonstração
  const saltRounds = 10;
  const anaPassword = process.env.DEMO_ANA_PASSWORD || 'senha-demo-ana';
  const marcosPassword = process.env.DEMO_MARCOS_PASSWORD || 'senha-demo-marcos';

  const anaPasswordHash = await bcrypt.hash(anaPassword, saltRounds);
  const marcosPasswordHash = await bcrypt.hash(marcosPassword, saltRounds);

  const userAna = await prisma.user.upsert({
    where: { email: 'ana.souza@escola.gov.br' },
    update: {
      name: 'Profª Ana Souza',
      passwordHash: anaPasswordHash,
      role: 'DOCENTE',
    },
    create: {
      email: 'ana.souza@escola.gov.br',
      name: 'Profª Ana Souza',
      passwordHash: anaPasswordHash,
      role: 'DOCENTE',
    },
  });

  const userMarcos = await prisma.user.upsert({
    where: { email: 'marcos.lima@escola.gov.br' },
    update: {
      name: 'Prof. Marcos Lima',
      passwordHash: marcosPasswordHash,
      role: 'DOCENTE',
    },
    create: {
      email: 'marcos.lima@escola.gov.br',
      name: 'Prof. Marcos Lima',
      passwordHash: marcosPasswordHash,
      role: 'DOCENTE',
    },
  });

  console.log(`✓ Docentes configurados: ${userAna.email}, ${userMarcos.email}`);

  // 2. Catálogo Oficial BNCC (docs/data/bncc-recorte.json)
  const bnccFilePath = path.resolve(__dirname, '../../../docs/data/bncc-recorte.json');
  if (!fs.existsSync(bnccFilePath)) {
    throw new Error(`Arquivo de recorte BNCC não encontrado em: ${bnccFilePath}`);
  }

  const bnccDataRaw = fs.readFileSync(bnccFilePath, 'utf-8');
  const bnccSkills: Array<{
    nivel: string;
    ano?: number | null;
    eixo: string;
    codigo: string;
    descricao: string;
    explicacao?: string;
    exemplos?: string;
  }> = JSON.parse(bnccDataRaw);

  let loadedSkillsCount = 0;
  for (const skill of bnccSkills) {
    await prisma.bnccSkill.upsert({
      where: { codigo: skill.codigo },
      update: {
        nivel: skill.nivel,
        ano: skill.ano ?? null,
        eixo: skill.eixo,
        descricao: skill.descricao,
        explicacao: skill.explicacao ?? null,
        exemplos: skill.exemplos ?? null,
      },
      create: {
        codigo: skill.codigo,
        nivel: skill.nivel,
        ano: skill.ano ?? null,
        eixo: skill.eixo,
        descricao: skill.descricao,
        explicacao: skill.explicacao ?? null,
        exemplos: skill.exemplos ?? null,
      },
    });
    loadedSkillsCount++;
  }

  console.log(`✓ Catálogo BNCC carregado com sucesso: ${loadedSkillsCount} habilidades.`);
  console.log('Seed concluído com sucesso.');
}

main()
  .catch((e) => {
    console.error('Erro durante execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
