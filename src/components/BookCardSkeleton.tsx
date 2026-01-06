import '../styles/components/BookCard.css'; // Reusing card styles for container

export function BookCardSkeleton() {
  return (
    <div className="book-card skeleton-card">
      <div className="skeleton-image"></div>
      <div className="book-info">
        <div className="skeleton-text title"></div>
        <div className="skeleton-text author"></div>
        <div className="book-footer">
           <div className="skeleton-text price"></div>
           <div className="skeleton-button"></div>
        </div>
      </div>
      <style>{`
        .skeleton-card {
            pointer-events: none;
            cursor: default;
        }
        .skeleton-image {
            width: 100%;
            height: 250px;
            background: #e0e0e0;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: skeleton-loading 1.5s infinite;
        }
        .skeleton-text {
            height: 1rem;
            margin-bottom: 0.5rem;
            border-radius: 4px;
            background: #e0e0e0;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: skeleton-loading 1.5s infinite;
        }
        .skeleton-text.title { height: 1.5rem; width: 80%; }
        .skeleton-text.author { height: 1rem; width: 60%; }
        .skeleton-text.price { height: 1.5rem; width: 30%; }
        .skeleton-button { 
            width: 40px; height: 40px; border-radius: 50%; 
            background: #e0e0e0; 
            animation: skeleton-loading 1.5s infinite;
        }
        @keyframes skeleton-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        /* Dark mode overrides */
        .dark-mode .skeleton-image,
        .dark-mode .skeleton-text,
        .dark-mode .skeleton-button {
             background: #1e293b; /* Match bg-secondary */
             background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
             background-size: 200% 100%;
        }
      `}</style>
    </div>
  );
}
