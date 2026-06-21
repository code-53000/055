import { PrismaClient, UserRole, MilestoneStatus, AssetStatus, FeedbackStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function createPlaceholder(filePath: string, content: string) {
  fs.writeFileSync(filePath, content);
}

async function main() {
  ensureDir(UPLOAD_DIR);

  const password = await bcrypt.hash('123456', 10);

  const [manager, designer, client] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'manager@demo.com' },
      update: {},
      create: { email: 'manager@demo.com', password, name: '王经理', role: UserRole.ACCOUNT_MANAGER },
    }),
    prisma.user.upsert({
      where: { email: 'designer@demo.com' },
      update: {},
      create: { email: 'designer@demo.com', password, name: '李设计师', role: UserRole.DESIGNER },
    }),
    prisma.user.upsert({
      where: { email: 'client@demo.com' },
      update: {},
      create: { email: 'client@demo.com', password, name: '张客户', role: UserRole.CLIENT },
    }),
  ]);

  console.log('用户创建完成:', manager.email, designer.email, client.email);

  let project = await prisma.project.findUnique({ where: { code: 'DEMO-2024-001' } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: '星辰奶茶品牌升级项目',
        code: 'DEMO-2024-001',
        description: '星辰奶茶2024年度品牌视觉升级，包括Logo、包装设计、门店海报等全套视觉物料。',
        managerId: manager.id,
        clientId: client.id,
        milestones: {
          create: [
            { name: '创意提案', description: '提交3套品牌方向创意方案', orderIndex: 1, status: MilestoneStatus.COMPLETED, completedAt: new Date() },
            { name: 'Logo设计稿', description: '确定方向后的Logo细化设计', orderIndex: 2, status: MilestoneStatus.REVIEW },
            { name: '包装设计', description: '产品外包装及杯型设计', orderIndex: 3, status: MilestoneStatus.IN_PROGRESS },
            { name: '门店海报与物料', description: '线下门店宣传海报及其他延展物料', orderIndex: 4, status: MilestoneStatus.PENDING },
            { name: '最终交付', description: '所有源文件与规范手册交付', orderIndex: 5, status: MilestoneStatus.PENDING },
          ],
        },
      },
    });
    console.log('示例项目创建完成:', project.name);
  }

  const milestones = await prisma.milestone.findMany({
    where: { projectId: project.id },
    orderBy: { orderIndex: 'asc' },
  });

  const logoMilestone = milestones.find((m) => m.name === 'Logo设计稿');
  const packagingMilestone = milestones.find((m) => m.name === '包装设计');

  const demoFiles = [
    { name: '主Logo方案', milestone: logoMilestone, versions: [
      { version: 1, changeLog: '初始提案：以茶叶+星星图形组合，偏手写字体风格', status: AssetStatus.REJECTED, fileName: 'logo_v1_demo.txt', isFinal: false },
      { version: 2, changeLog: 'V2调整：根据客户反馈简化图形，改用更简洁的现代字体', status: AssetStatus.REVIEW, fileName: 'logo_v2_demo.txt', isFinal: false },
      { version: 3, changeLog: 'V3终稿：优化配色为暖金色，调整星星角度，客户已口头确认', status: AssetStatus.FINAL, fileName: 'logo_v3_demo.txt', isFinal: true },
    ]},
    { name: '产品外包装', milestone: packagingMilestone, versions: [
      { version: 1, changeLog: '首版设计：手绘风格，突出田园感', status: AssetStatus.REJECTED, fileName: 'package_v1_demo.txt', isFinal: false },
      { version: 2, changeLog: 'V2调整：改成国潮风格，添加祥云纹样，配色改为朱砂红+米白', status: AssetStatus.REVIEW, fileName: 'package_v2_demo.txt', isFinal: false },
    ]},
  ];

  for (const group of demoFiles) {
    for (const v of group.versions) {
      const filePath = path.join(UPLOAD_DIR, v.fileName);
      if (!fs.existsSync(filePath)) {
        createPlaceholder(
          filePath,
          `=== 星辰奶茶项目示例文件 ===\n素材: ${group.name}\n版本: v${v.version}\n修改说明: ${v.changeLog}\n状态: ${v.status}\n这是一个演示用的占位文件，真实系统中会是设计师上传的图片/PSD/AI等设计稿。\n`
        );
      }
      const existing = await prisma.asset.findFirst({
        where: { projectId: project!.id, name: group.name, version: v.version },
      });
      if (!existing) {
        await prisma.asset.create({
          data: {
            projectId: project!.id,
            milestoneId: group.milestone?.id,
            uploaderId: designer.id,
            version: v.version,
            name: group.name,
            fileName: v.fileName,
            filePath,
            mimeType: 'text/plain',
            size: fs.statSync(filePath).size,
            changeLog: v.changeLog,
            status: v.status,
            isFinal: v.isFinal,
          },
        });
      }
    }
  }

  const logoAsset = await prisma.asset.findFirst({
    where: { projectId: project.id, name: '主Logo方案', version: 1 },
  });
  const logoAssetV2 = await prisma.asset.findFirst({
    where: { projectId: project.id, name: '主Logo方案', version: 2 },
  });

  const demoFeedbacks = [
    { asset: logoAsset, author: client, content: '这个手写字体太花哨了，不够大气，能不能换个更现代点的字体？图形部分也可以再简化一下。', status: FeedbackStatus.RESOLVED },
    { asset: logoAsset, author: manager, content: '收到，我们马上出第二版，预计明天下午前发您。', status: FeedbackStatus.RESOLVED },
    { asset: logoAssetV2, author: client, content: '这版比上一版好多了！配色能不能再暖一点，logo那个星星的角度稍微调一下。其他OK~', status: FeedbackStatus.OPEN },
  ];

  for (const f of demoFeedbacks) {
    const exists = await prisma.feedback.findFirst({
      where: { assetId: f.asset?.id, content: f.content },
    });
    if (!exists && f.asset) {
      await prisma.feedback.create({
        data: {
          projectId: project!.id,
          milestoneId: f.asset.milestoneId ?? undefined,
          assetId: f.asset.id,
          authorId: f.author.id,
          content: f.content,
          status: f.status,
        },
      });
    }
  }

  console.log('\n========== 种子数据已就绪 ==========');
  console.log('登录账号（密码都是 123456）：');
  console.log('  客户经理: manager@demo.com');
  console.log('  设计师:   designer@demo.com');
  console.log('  客户:     client@demo.com');
  console.log('示例项目: 星辰奶茶品牌升级项目');
  console.log('  - 已预置3版Logo素材、2版包装素材及若干客户反馈');
  console.log('====================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
