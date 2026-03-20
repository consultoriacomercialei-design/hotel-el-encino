import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Concept from './components/Concept';
import Rooms from './components/Rooms';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import MapSection from './components/MapSection';
import SocialFloat from './components/SocialFloat';
import Footer from './components/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <SocialFloat />
      <main>
        <Hero />
        <Concept />
        <Rooms />
        <Features />
        <Testimonials />
        <MapSection />
      </main>
      <Footer />
    </>
  );
}
