import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { createReview, updateReview, ReviewFormData } from '../services/reviewService';
import '../styles/components/ReviewForm.css';

interface ReviewFormProps {
  libroId: number;
  existingReview?: {
    id: number;
    rating: number;
    comment: string;
  };
  onSuccess: () => void;
  onCancel?: () => void;
}

export function ReviewForm({ libroId, existingReview, onSuccess, onCancel }: ReviewFormProps) {
  const { } = useLanguage();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Por favor selecciona una calificación');
      return;
    }

    if (comment.trim().length < 10) {
      setError('El comentario debe tener al menos 10 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const reviewData: ReviewFormData = {
        libro_id: libroId,
        rating,
        comment: comment.trim()
      };

      let result;
      if (existingReview) {
        result = await updateReview(existingReview.id, reviewData);
      } else {
        result = await createReview(reviewData);
      }

      if (result) {
        onSuccess();
      } else {
        setError('Error al guardar la reseña. Por favor intenta de nuevo.');
      }
    } catch (err) {
      setError('Error inesperado. Por favor intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <h3 className="review-form__title">
        {existingReview ? 'Editar tu reseña' : 'Escribe una reseña'}
      </h3>

      <div className="review-form__rating">
        <label className="review-form__label">Tu calificación:</label>
        <div className="review-form__stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`review-form__star ${
                star <= (hoveredRating || rating) ? 'review-form__star--filled' : ''
              }`}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
            >
              <Star
                size={32}
                fill={star <= (hoveredRating || rating) ? 'currentColor' : 'none'}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="review-form__comment">
        <label htmlFor="comment" className="review-form__label">
          Tu opinión:
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comparte tu experiencia con este libro..."
          rows={5}
          className="review-form__textarea"
          required
          minLength={10}
        />
        <span className="review-form__counter">
          {comment.length} caracteres (mínimo 10)
        </span>
      </div>

      {error && (
        <div className="review-form__error">
          {error}
        </div>
      )}

      <div className="review-form__actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="review-form__button review-form__button--cancel"
            disabled={loading}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="review-form__button review-form__button--submit"
          disabled={loading || rating === 0}
        >
          {loading ? 'Guardando...' : existingReview ? 'Actualizar reseña' : 'Publicar reseña'}
        </button>
      </div>
    </form>
  );
}
