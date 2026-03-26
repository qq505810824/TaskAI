// Mock数据加载器
import usersData from '@/datas/mock/users.json';
import meetsData from '@/datas/mock/meets.json';
import conversationsData from '@/datas/mock/conversations.json';
import todosData from '@/datas/mock/todos.json';
import summariesData from '@/datas/mock/meet-summaries.json';
import type { User, Meet, Conversation, Todo, MeetSummary } from '@/types/meeting';

// 类型转换
export const mockUsers: User[] = usersData as User[];
export const mockMeets: Meet[] = meetsData as Meet[];
export const mockConversations: Conversation[] = conversationsData as Conversation[];
export const mockTodos: Todo[] = todosData as Todo[];
export const mockSummaries: MeetSummary[] = summariesData as MeetSummary[];

// 模拟延迟
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 生成唯一ID
export const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
