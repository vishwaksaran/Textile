import { Navbar } from '@/components/store/navbar';
import { Footer } from '@/components/store/footer';
import { CartDrawer } from '@/components/store/cart-drawer';
import { MobileNav } from '@/components/store/mobile-nav';
import { SearchDialog } from '@/components/store/search-dialog';
import { WhatsAppFab } from '@/components/store/whatsapp-fab';
import { getCategories, usingDemoData } from '@/lib/data';
import { DemoDataNotice } from '@/components/store/demo-notice';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();

  return (
    <>
      <Navbar categories={categories} />
      {usingDemoData && <DemoDataNotice />}
      <main id="main" className="flex-grow pb-16 md:pb-0">
        {children}
      </main>
      <Footer categories={categories} />
      <CartDrawer />
      <SearchDialog />
      <WhatsAppFab />
      <MobileNav />
    </>
  );
}
