import { Link } from 'react-router-dom';

export function NotFound({ message = 'Cette page n’existe pas.' }: { message?: string }) {
  return (
    <div className="empty">
      <span className="emoji">🧭</span>
      <p>{message}</p>
      <Link to="/" className="btn">
        Retour à l’accueil
      </Link>
    </div>
  );
}
