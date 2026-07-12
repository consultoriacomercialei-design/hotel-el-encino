import { Suspense } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AutoOpenBooking from './components/AutoOpenBooking';
import MarqueeStrip from './components/MarqueeStrip';
import Concept from './components/Concept';
import Rooms from './components/Rooms';
import Features from './components/Features';
import Explore from './components/Explore';
import Testimonials from './components/Testimonials';
import MapSection from './components/MapSection';
import FAQ from './components/FAQ';
import SocialFloat from './components/SocialFloat';
import BlogPreview from './components/BlogPreview';
import Footer from './components/Footer';
import BookingModal from './components/BookingModal';
import BookingFloat from './components/BookingFloat';
import AIChat from './components/AIChat';
import { fetchGoogleReviews } from './lib/google-reviews';

export const dynamic = 'force-dynamic'; // render server-side so env vars are available

export default async function Home() {
  const googleData = await fetchGoogleReviews(4);

  return (
    <>
      <Suspense fallback={null}><AutoOpenBooking /></Suspense>
      <Navbar />
      <SocialFloat />
      <BookingModal />
      <BookingFloat />
      <AIChat />
      <main>
        <Hero />
        <MarqueeStrip
          items={['Santiago', 'Naturaleza', 'Descanso', 'Hotel El Encino', 'Nuevo León', 'Aventura', 'Cola de Caballo', 'Hospitalidad']}
          speed={32}
          size="md"
          theme="light"
        />
        <Concept />
        <Rooms />
        <MarqueeStrip
          items={['Habitaciones', 'Centro Histórico', 'Descanso total', 'WiFi', 'Estacionamiento', 'Check-in flexible', 'A 45 min de Monterrey']}
          speed={26}
          size="sm"
          theme="dark"
        />
        <Features />
        <Explore />
        <BlogPreview />
        <Testimonials
          liveReviews={googleData?.reviews}
          summary={googleData ? { rating: googleData.rating, total: googleData.user_ratings_total } : undefined}
        />
        <FAQ />
        <MapSection />
      </main>
      <Footer />
    </>
  );
}
