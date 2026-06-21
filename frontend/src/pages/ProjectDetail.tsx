import React from 'react';
import {
  Card,
  Tabs,
  Typography,
  Space,
  Tag,
  Steps,
  Button,
  App,
  Descriptions,
  Select,
  Input,
  Modal,
  Form,
  Upload,
  Table,
  List,
  Avatar,
  Tooltip,
  Dropdown,
  MenuProps,
  Empty,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  CheckCircleTwoTone,
  MessageOutlined,
  FileOutlined,
  HistoryOutlined,
  MoreOutlined,
  CrownFilled,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api';
import type { Project, Milestone, Asset, Feedback, MilestoneStatus, AssetStatus, UserRole } from '../types';
import { useAuth } from '../auth';

const milestoneColor: Record<MilestoneStatus, string> = {
  PENDING: 'default',
  IN_PROGRESS: 'processing',
  REVIEW: 'orange',
  APPROVED: 'cyan',
  COMPLETED: 'green',
};
const milestoneLabel: Record<MilestoneStatus, string> = {
  PENDING: '未开始',
  IN_PROGRESS: '进行中',
  REVIEW: '待审核',
  APPROVED: '已通过',
  COMPLETED: '已完成',
};

const assetColor: Record<AssetStatus, string> = {
  DRAFT: 'default',
  REVIEW: 'orange',
  APPROVED: 'cyan',
  REJECTED: 'red',
  FINAL: 'green',
};
const assetLabel: Record<AssetStatus, string> = {
  DRAFT: '草稿',
  REVIEW: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  FINAL: '定稿',
};

const roleLabel: Record<UserRole, string> = {
  ACCOUNT_MANAGER: '客户经理',
  DESIGNER: '设计师',
  CLIENT: '客户',
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id!, 10);
  const [project, setProject] = React.useState<Project | null>(null);
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [feedbacks, setFeedbacks] = React.useState<Feedback[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('milestones');
  const { user } = useAuth();
  const { message, modal } = App.useApp();

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [currentAsset, setCurrentAsset] = React.useState<Asset | null>(null);
  const [compareName, setCompareName] = React.useState<string>('');
  const [compareVersions, setCompareVersions] = React.useState<Asset[]>([]);
  const [assetNames, setAssetNames] = React.useState<string[]>([]);
  const [uploadForm] = Form.useForm();
  const [feedbackForm] = Form.useForm();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [projRes, assetsRes, feedbackRes, namesRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/assets/project/${projectId}`),
        api.get(`/feedbacks/project/${projectId}`),
        api.get(`/assets/project/${projectId}/names`),
      ]);
      setProject(projRes.data);
      setAssets(assetsRes.data);
      setFeedbacks(feedbackRes.data);
      setAssetNames(namesRes.data);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAll();
  }, [projectId]);

  const handleMilestoneChange = async (mid: number, status: MilestoneStatus) => {
    try {
      await api.patch(`/projects/milestones/${mid}`, { status });
      message.success('节点状态已更新');
      fetchAll();
    } catch (err: any) {
      message.error(err.response?.data?.error || '更新失败');
    }
  };

  const handleUpload = async () => {
    try {
      const values = await uploadForm.validateFields();
      const formData = new FormData();
      formData.append('projectId', String(projectId));
      if (values.milestoneId) formData.append('milestoneId', String(values.milestoneId));
      formData.append('name', values.name);
      if (values.changeLog) formData.append('changeLog', values.changeLog);
      formData.append('file', values.file.file);
      await api.post('/assets', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      message.success('素材上传成功');
      setUploadOpen(false);
      uploadForm.resetFields();
      fetchAll();
    } catch (err: any) {
      message.error(err.response?.data?.error || '上传失败');
    }
  };

  const handleMarkFinal = async (assetId: number) => {
    modal.confirm({
      title: '标记为最终版本？',
      content: '标记后该素材会被作为定稿版本，其他同名称版本将取消定稿状态。',
      onOk: async () => {
        try {
          await api.post(`/assets/${assetId}/final`);
          message.success('已标记为最终版本');
          fetchAll();
        } catch (err: any) {
          message.error(err.response?.data?.error || '操作失败');
        }
      },
    });
  };

  const handleCompare = async (name: string) => {
    if (!name) return;
    const res = await api.get(`/assets/project/${projectId}/compare/${encodeURIComponent(name)}`);
    setCompareVersions(res.data);
  };

  const openFeedback = (asset: Asset | null = null) => {
    setCurrentAsset(asset);
    feedbackForm.resetFields();
    setFeedbackOpen(true);
  };

  const submitFeedback = async () => {
    try {
      const values = await feedbackForm.validateFields();
      const milestone = project?.milestones[0];
      await api.post('/feedbacks', {
        projectId,
        assetId: currentAsset?.id,
        milestoneId: milestone?.id,
        content: values.content,
      });
      message.success('反馈已提交');
      setFeedbackOpen(false);
      feedbackForm.resetFields();
      fetchAll();
    } catch (err: any) {
      message.error(err.response?.data?.error || '提交失败');
    }
  };

  const resolveFeedback = async (fid: number) => {
    try {
      await api.post(`/feedbacks/${fid}/resolve`);
      message.success('反馈已处理');
      fetchAll();
    } catch (err: any) {
      message.error(err.response?.data?.error || '操作失败');
    }
  };

  const assetDropdown = (asset: Asset): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      { key: 'download', label: '下载素材', icon: <DownloadOutlined /> },
      { key: 'feedback', label: '针对此素材提反馈', icon: <MessageOutlined /> },
    ];
    if (user?.role === 'CLIENT' && !asset.isFinal) {
      items.push({ key: 'final', label: '标记为定稿', icon: <CrownFilled style={{ color: '#faad14' }} /> });
    }
    return items;
  };

  const handleAssetMenu = async ({ key }: { key: string }, asset: Asset) => {
    if (key === 'download') window.open(`/api/assets/${asset.id}/download`, '_blank');
    if (key === 'feedback') openFeedback(asset);
    if (key === 'final') handleMarkFinal(asset.id);
  };

  if (loading || !project) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Typography.Title level={4}>加载中...</Typography.Title>
      </div>
    );
  }

  const groupedAssets = assetNames.map((name) => ({
    name,
    items: assets.filter((a) => a.name === name).sort((a, b) => b.version - a.version),
  }));

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {project.name}
            </Typography.Title>
            <Tag color="blue">{project.code}</Tag>
          </Space>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            {project.description || '暂无描述'}
          </Typography.Paragraph>
          <Descriptions size="small" column={3} style={{ marginTop: 8 }}>
            <Descriptions.Item label="客户经理">{project.manager.name}</Descriptions.Item>
            <Descriptions.Item label="客户">{project.client.name}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(project.createdAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

      <Card
        tabBarExtraContent={
          tab === 'assets' && (user?.role === 'DESIGNER' || user?.role === 'ACCOUNT_MANAGER') ? (
            <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>
              上传素材
            </Button>
          ) : tab === 'feedbacks' ? (
            <Button type="primary" icon={<MessageOutlined />} onClick={() => openFeedback()}>
              提交反馈
            </Button>
          ) : null
        }
      >
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'milestones',
              label: `项目节点 (${project.milestones.length})`,
              children: (
                <div>
                  <Steps
                    direction="vertical"
                    size="small"
                    current={project.milestones.findIndex((m) => m.status !== 'COMPLETED')}
                    items={project.milestones.map((m) => ({
                      title: (
                        <Space>
                          <span>{m.name}</span>
                          <Tag color={milestoneColor[m.status]}>{milestoneLabel[m.status]}</Tag>
                          {m.dueDate && (
                            <span style={{ color: '#999', fontSize: 12 }}>
                              截止：{dayjs(m.dueDate).format('YYYY-MM-DD')}
                            </span>
                          )}
                        </Space>
                      ),
                      description: (
                        <div>
                          <div style={{ color: '#666', marginBottom: 8 }}>
                            {m.description || '暂无说明'}
                          </div>
                          <Space wrap>
                            {(['PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] as MilestoneStatus[]).map(
                              (s) => (
                                <Button
                                  key={s}
                                  size="small"
                                  type={m.status === s ? 'primary' : 'default'}
                                  onClick={() => handleMilestoneChange(m.id, s)}
                                >
                                  设为{milestoneLabel[s]}
                                </Button>
                              )
                            )}
                          </Space>
                        </div>
                      ),
                      status:
                        m.status === 'COMPLETED'
                          ? 'finish'
                          : m.status === 'IN_PROGRESS'
                          ? 'process'
                          : m.status === 'PENDING'
                          ? 'wait'
                          : m.status === 'REVIEW'
                          ? 'process'
                          : 'finish',
                    }))}
                  />
                </div>
              ),
            },
            {
              key: 'assets',
              label: `素材版本 (${assets.length})`,
              children: (
                <div>
                  {groupedAssets.length === 0 ? (
                    <Empty description="暂无素材，设计师可以点击右上角上传" />
                  ) : (
                    groupedAssets.map((g) => (
                      <Card
                        key={g.name}
                        size="small"
                        title={
                          <Space>
                            <FileOutlined />
                            <span>{g.name}</span>
                            {g.items.find((a) => a.isFinal) && (
                              <Tag color="gold" icon={<CrownFilled />}>
                                已定稿 v{g.items.find((a) => a.isFinal)?.version}
                              </Tag>
                            )}
                            <Button
                              size="small"
                              type="link"
                              icon={<HistoryOutlined />}
                              onClick={() => handleCompare(g.name)}
                            >
                              版本对比
                            </Button>
                          </Space>
                        }
                        style={{ marginBottom: 12 }}
                      >
                        <List
                          size="small"
                          dataSource={g.items}
                          renderItem={(a) => (
                            <List.Item
                              actions={[
                                <Tooltip title="更多操作">
                                  <Dropdown
                                    menu={{
                                      items: assetDropdown(a),
                                      onClick: (e) => handleAssetMenu(e, a),
                                    }}
                                  >
                                    <Button size="small" type="text" icon={<MoreOutlined />} />
                                  </Dropdown>
                                </Tooltip>,
                              ]}
                            >
                              <List.Item.Meta
                                avatar={
                                  a.isFinal ? (
                                    <CheckCircleTwoTone twoToneColor="#52c41a" />
                                  ) : (
                                    <Avatar style={{ backgroundColor: '#1677ff' }}>
                                      v{a.version}
                                    </Avatar>
                                  )
                                }
                                title={
                                  <Space>
                                    <strong>v{a.version}</strong>
                                    <Tag color={assetColor[a.status]}>{assetLabel[a.status]}</Tag>
                                    {a.milestone && <Tag>{a.milestone.name}</Tag>}
                                    {a.isFinal && (
                                      <Tag color="gold" icon={<CrownFilled />}>
                                        最终版
                                      </Tag>
                                    )}
                                    <span style={{ color: '#999', fontSize: 12 }}>
                                      {a.uploader.name}（{roleLabel[a.uploader.role]}）
                                      · {dayjs(a.createdAt).format('MM-DD HH:mm')}
                                      · {(a.size / 1024).toFixed(1)}KB
                                    </span>
                                  </Space>
                                }
                                description={
                                  <Typography.Paragraph
                                    type="secondary"
                                    style={{ margin: 0 }}
                                    ellipsis={{ rows: 2 }}
                                  >
                                    {a.changeLog}
                                  </Typography.Paragraph>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      </Card>
                    ))
                  )}

                  {compareVersions.length > 0 && (
                    <Modal
                      title={`版本对比 - ${compareVersions[0]?.name || ''}`}
                      open
                      width={900}
                      onCancel={() => setCompareVersions([])}
                      footer={[
                        <Button key="close" onClick={() => setCompareVersions([])}>
                          关闭
                        </Button>,
                      ]}
                    >
                      <Table
                        size="small"
                        pagination={false}
                        dataSource={compareVersions}
                        rowKey="id"
                        columns={[
                          { title: '版本', dataIndex: 'version', width: 80, render: (v) => <strong>v{v}</strong> },
                          { title: '状态', dataIndex: 'status', width: 100, render: (s: AssetStatus) => <Tag color={assetColor[s]}>{assetLabel[s]}</Tag> },
                          {
                            title: '最终版',
                            dataIndex: 'isFinal',
                            width: 80,
                            render: (v) => (v ? <CrownFilled style={{ color: '#faad14' }} /> : '-'),
                          },
                          { title: '上传者', dataIndex: ['uploader', 'name'], width: 100 },
                          { title: '修改说明', dataIndex: 'changeLog' },
                          {
                            title: '上传时间',
                            dataIndex: 'createdAt',
                            width: 160,
                            render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
                          },
                          {
                            title: '操作',
                            width: 100,
                            render: (_t, r) => (
                              <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() => window.open(`/api/assets/${r.id}/download`, '_blank')}
                              >
                                下载
                              </Button>
                            ),
                          },
                        ]}
                      />
                    </Modal>
                  )}
                </div>
              ),
            },
            {
              key: 'compare',
              label: '版本对比',
              children: (
                <div>
                  <Space style={{ marginBottom: 16 }}>
                    <span>选择素材名称：</span>
                    <Select
                      style={{ width: 320 }}
                      placeholder="选择要对比的素材"
                      value={compareName || undefined}
                      onChange={(v) => {
                        setCompareName(v);
                        handleCompare(v);
                      }}
                      options={assetNames.map((n) => ({ label: n, value: n }))}
                    />
                  </Space>
                  {compareVersions.length > 0 ? (
                    <Table
                      size="small"
                      dataSource={compareVersions}
                      rowKey="id"
                      columns={[
                        { title: '版本', dataIndex: 'version', render: (v) => <strong>v{v}</strong> },
                        { title: '状态', dataIndex: 'status', render: (s: AssetStatus) => <Tag color={assetColor[s]}>{assetLabel[s]}</Tag> },
                        { title: '最终版', dataIndex: 'isFinal', render: (v) => (v ? <CrownFilled style={{ color: '#faad14' }} /> : '-') },
                        { title: '上传者', dataIndex: ['uploader', 'name'] },
                        { title: '修改说明', dataIndex: 'changeLog' },
                        { title: '反馈数', dataIndex: ['_count', 'feedbacks'] },
                        {
                          title: '上传时间',
                          dataIndex: 'createdAt',
                          render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
                        },
                        {
                          title: '操作',
                          render: (_t, r) => (
                            <Button
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => window.open(`/api/assets/${r.id}/download`, '_blank')}
                            >
                              下载
                            </Button>
                          ),
                        },
                      ]}
                    />
                  ) : (
                    <Empty description="请选择一个素材名称查看版本对比" />
                  )}
                </div>
              ),
            },
            {
              key: 'feedbacks',
              label: `客户反馈 (${feedbacks.length})`,
              children: (
                <div>
                  {feedbacks.length === 0 ? (
                    <Empty description="暂无反馈" />
                  ) : (
                    <List
                      dataSource={feedbacks}
                      renderItem={(f) => (
                        <List.Item
                          actions={
                            f.status === 'OPEN'
                              ? [
                                  <Button
                                    key="resolve"
                                    size="small"
                                    type="link"
                                    onClick={() => resolveFeedback(f.id)}
                                  >
                                    标记已处理
                                  </Button>,
                                ]
                              : []
                          }
                        >
                          <List.Item.Meta
                            avatar={
                              <Avatar style={{ backgroundColor: f.author.role === 'CLIENT' ? '#52c41a' : '#1677ff' }}>
                                {f.author.name[0]}
                              </Avatar>
                            }
                            title={
                              <Space>
                                <strong>{f.author.name}</strong>
                                <Tag>{roleLabel[f.author.role]}</Tag>
                                {f.asset && (
                                  <Tag color="blue">
                                    针对 {f.asset.name} v{f.asset.version}
                                  </Tag>
                                )}
                                {f.status === 'OPEN' ? (
                                  <Tag color="red">待处理</Tag>
                                ) : (
                                  <Tag color="green">已处理</Tag>
                                )}
                                <span style={{ color: '#999', fontSize: 12 }}>
                                  {dayjs(f.createdAt).format('YYYY-MM-DD HH:mm')}
                                </span>
                              </Space>
                            }
                            description={f.content}
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="上传素材"
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        onOk={handleUpload}
        destroyOnClose
      >
        <Form form={uploadForm} layout="vertical">
          <Form.Item name="name" label="素材名称" rules={[{ required: true, message: '请输入素材名称（同名会自动累加版本号）' }]}>
            <Input placeholder="例如：主Logo方案" />
          </Form.Item>
          <Form.Item name="milestoneId" label="所属节点">
            <Select placeholder="选择所属项目节点">
              {project.milestones.map((m) => (
                <Select.Option key={m.id} value={m.id}>
                  {m.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="changeLog" label="修改说明">
            <Input.TextArea rows={3} placeholder="本版本做了哪些修改" />
          </Form.Item>
          <Form.Item
            name="file"
            label="文件"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
            rules={[{ required: true, message: '请上传文件' }]}
          >
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={currentAsset ? `针对「${currentAsset.name} v${currentAsset.version}」提反馈` : '提交反馈'}
        open={feedbackOpen}
        onCancel={() => setFeedbackOpen(false)}
        onOk={submitFeedback}
        destroyOnClose
      >
        <Form form={feedbackForm} layout="vertical">
          <Form.Item name="content" label="反馈内容" rules={[{ required: true, message: '请输入反馈内容' }]}>
            <Input.TextArea rows={5} placeholder="请详细描述您的修改意见或确认信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
