import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Compass className="h-16 w-16 text-primary-600 mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-gray-600 mb-6">
          We could not find that page. It may have moved, or the link may be wrong.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link to="/" className="btn-primary">
            Go to home
          </Link>
          <Link to="/marketplace" className="btn-secondary">
            Browse marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}