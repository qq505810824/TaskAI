import { useAuth } from '@/hooks/useAuth';
import { Menu, Transition } from '@headlessui/react';
import {
    ArrowRightOnRectangleIcon,
    ClipboardDocumentListIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { Fragment } from 'react';

function MenuButton(props: any) {
    const router = useRouter();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        localStorage.removeItem('talent_token');
        router.push('/login');
    }
    return (
        <Menu as="div" className="relative">
            <div className="flex items-center">
                <Menu.Button className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
                    <div className="w-10 h-10 bg-indigo-600 rounded-full overflow-hidden border-2 border-indigo-200 flex items-center justify-center text-white text-sm font-medium shadow-sm transition-transform hover:scale-105 active:scale-95">
                        {props?.avatar ? (
                            <img src={props.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            (props?.name?.[0] ?? '?').toUpperCase()
                        )}
                    </div>
                </Menu.Button>
            </div>
            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 mt-2 min-w-56 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-gray-200 ring-opacity-5 focus:outline-none flex flex-col gap-1 py-1.5 z-50 overflow-hidden border border-gray-100">
                    <div className="px-3 py-2 border-b border-gray-50 bg-gray-50/50">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            当前用户
                        </div>
                        <div className="text-sm font-medium text-gray-700 truncate">
                            {props?.name || 'Loading...'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                            {props?.email || ''}
                        </div>
                    </div>

                    <div className="px-1.5 pt-1.5">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    className={`${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                                        } group flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition-colors`}
                                    onClick={() => {
                                        router.push('/taskai/tasks');
                                    }}
                                >
                                    <ClipboardDocumentListIcon className={`mr-3 h-5 w-5 ${active ? 'text-indigo-600' : 'text-gray-400'}`} aria-hidden="true" />
                                    My Tasks
                                </button>
                            )}
                        </Menu.Item>
                    </div>

                    <div className="px-1.5 border-t border-gray-50 mt-1.5 pt-1.5">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    className={`${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                                        } group flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition-colors`}
                                    onClick={() => {
                                        router.push('/my/settings');
                                    }}
                                >
                                    <Cog6ToothIcon className={`mr-3 h-5 w-5 ${active ? 'text-indigo-600' : 'text-gray-400'}`} aria-hidden="true" />
                                    个人设置
                                </button>
                            )}
                        </Menu.Item>
                    </div>

                    <div className="px-1.5 border-t border-gray-50 mt-1.5 pt-1.5">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    className={`${active ? 'bg-red-50 text-red-700' : 'text-gray-700'
                                        } group flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition-colors`}
                                    onClick={() => {
                                        handleLogout();
                                    }}
                                >
                                    <ArrowRightOnRectangleIcon
                                        className={`mr-3 h-5 w-5 ${active ? 'text-red-600' : 'text-gray-400'}`}
                                        aria-hidden="true"
                                    />
                                    登出账号
                                </button>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}

export default MenuButton;
