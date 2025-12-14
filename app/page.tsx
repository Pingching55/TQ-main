import Link from 'next/link';
import './landing.css';

export default function Home() {
  return (
    <div className="landing-page">
      <div className="text-center">
        <h1>Trade Journal</h1>
        <p>Track and analyze your trading performance with precision and elegance</p>
        <Link href="/auth/login" className="gold-button">
          Get Started
        </Link>
      </div>
    </div>
  );
}
