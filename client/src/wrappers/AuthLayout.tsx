import { Link, Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <main className='h-screen flex flex-col justify-center items-center bg-bg-light-1 p-2 px-6'>
      <nav className='absolute top-6 left-16 xl:left-64 xl:px-32'>
        <Link to='/'>LOGO</Link>
      </nav>
      <section className='w-full md:w-[450px]'>
        <Outlet />
      </section>
    </main>
  );
};

export default AuthLayout;
