import { HiOutlineCalendarDays, HiOutlineHome } from 'react-icons/hi2';

import PageItem from '../pages/PageItem';
import PagestList from '../pages/PagestList';
import PageChatItem from '../pages/PageChatItem';
import SidebarHeader from './SidebarHeader';
import { useProjectContext } from '../../context/ProjectContext';

const ProjectSidebar = () => {
  const { isAdmin, isOwner, projectData } = useProjectContext();
  const { name, pages, chats } = projectData;

  return (
    <>
      <SidebarHeader
        name={name}
        isAdmin={isAdmin}
        isOwner={isOwner}
      />
      <section className='mb-6'>
        <h2 className='uppercase text-xs font-semibold text-text-dark-2 px-2 mb-2'>
          General Pages
        </h2>
        <ul className='px-2'>
          <PageItem
            label='Home'
            icon={<HiOutlineHome />}
            link='home'
          />
          <PageItem
            label='Events'
            icon={<HiOutlineCalendarDays />}
            link='events'
          />
          <PageChatItem chats={chats} />
        </ul>
      </section>
      <section className='mb-6'>
        <PagestList
          title='Project Pages'
          pages={pages}
        />
      </section>
    </>
  );
};

export default ProjectSidebar;
