import React from 'react';
import { Card, List, Tag, Button, Space, Typography, Empty, Modal, Form, Input, App } from 'antd';
import { PlusOutlined, FolderOpenOutlined, UserOutlined, FileOutlined, MessageOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api';
import type { Project, MilestoneStatus } from '../types';
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

export default function ProjectList() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await api.post('/projects', {
        ...values,
        milestones: [
          { name: '创意提案', orderIndex: 1 },
          { name: '设计稿', orderIndex: 2 },
          { name: '修改稿', orderIndex: 3 },
          { name: '最终交付', orderIndex: 4 },
        ],
      });
      message.success('项目创建成功');
      setCreateOpen(false);
      form.resetFields();
      fetchProjects();
    } catch (err: any) {
      message.error(err.response?.data?.error || '创建失败');
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          我的项目
        </Typography.Title>
        {user?.role === 'ACCOUNT_MANAGER' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建项目
          </Button>
        )}
      </div>

      {projects.length === 0 && !loading ? (
        <Empty description="暂无项目" />
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
          loading={loading}
          dataSource={projects}
          renderItem={(p) => (
            <List.Item>
              <Card
                hoverable
                onClick={() => navigate(`/projects/${p.id}`)}
                style={{ height: '100%' }}
                actions={[
                  <Space key="stat">
                    <span style={{ color: '#999' }}><FileOutlined /> {p._count?.assets || 0}</span>
                    <span style={{ color: '#999' }}><MessageOutlined /> {p._count?.feedbacks || 0}</span>
                  </Space>,
                  <Button key="open" type="link" icon={<FolderOpenOutlined />}>
                    进入
                  </Button>,
                ]}
              >
                <Card.Meta
                  title={<Space>{p.name}<Tag color="blue">{p.code}</Tag></Space>}
                  description={
                    <div style={{ color: '#888', fontSize: 13 }}>
                      <div style={{ marginBottom: 8 }}>{p.description || '暂无描述'}</div>
                      <Space direction="vertical" size={4}>
                        <div><UserOutlined /> 客户经理：{p.manager.name}</div>
                        <div><UserOutlined /> 客户：{p.client.name}</div>
                        <div>创建于 {dayjs(p.createdAt).format('YYYY-MM-DD')}</div>
                      </Space>
                      <div style={{ marginTop: 12 }}>
                        {p.milestones.map((m) => (
                          <Tag key={m.id} color={milestoneColor[m.status]} style={{ marginBottom: 4 }}>
                            {m.name} · {milestoneLabel[m.status]}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  }
                />
              </Card>
            </List.Item>
          )}
        />
      )}

      <Modal
        title="新建项目"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
            <Input placeholder="例如：2024春季新品推广" />
          </Form.Item>
          <Form.Item name="code" label="项目编号" rules={[{ required: true }]}>
            <Input placeholder="例如：AD-2024-001" />
          </Form.Item>
          <Form.Item name="clientId" label="客户账号ID" rules={[{ required: true }]}>
            <Input type="number" placeholder="输入客户用户ID" />
          </Form.Item>
          <Form.Item name="description" label="项目描述">
            <Input.TextArea rows={3} placeholder="项目简介与背景说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
