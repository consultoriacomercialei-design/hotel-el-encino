import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Concept from './components/Concept';
import Rooms from './components/Rooms';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Concept />
        <Rooms />
        <Features />
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}
