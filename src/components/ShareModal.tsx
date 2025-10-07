import React, { useState } from 'react';
import { X, Facebook, Twitter, Mail, MessageCircle, Copy, Check } from 'lucide-react';
import { Book } from '../types';
import '../styles/components/ShareModal.css';

interface ShareModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ book, isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const bookUrl = `${window.location.origin}/libro/${book.id}`;
  const shareText = `¡Mira este libro increíble! "${book.title}" por ${book.author} - Solo $${book.price}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      className: 'facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bookUrl)}`
    },
    {
      name: 'Twitter',
      icon: Twitter,
      className: 'twitter',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(bookUrl)}`
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      className: 'whatsapp',
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${bookUrl}`)}`
    },
    {
      name: 'Email',
      icon: Mail,
      className: 'email',
      url: `mailto:?subject=${encodeURIComponent(`Te recomiendo: ${book.title}`)}&body=${encodeURIComponent(`${shareText}\n\nVer más: ${bookUrl}`)}`
    }
  ];

  return (
    <div className="sharemodal-overlay" onClick={onClose}>
      <div className="sharemodal" onClick={(e) => e.stopPropagation()}>
        <div className="sharemodal__header">
          <h3 className="sharemodal__title">Compartir Libro</h3>
          <button onClick={onClose} className="sharemodal__close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="sharemodal__book-info">
          <div className="sharemodal__book-cover">
            <img src={book.coverImage} alt={book.title} />
          </div>
          <div className="sharemodal__book-details">
            <h4 className="sharemodal__book-title">{book.title}</h4>
            <p className="sharemodal__book-author">por {book.author}</p>
            <p className="sharemodal__book-price">${book.price}</p>
          </div>
        </div>

        <div className="sharemodal__options">
          {shareOptions.map((option) => {
            const Icon = option.icon;
            return (
              <a
                key={option.name}
                href={option.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`sharemodal__option sharemodal__option--${option.className}`}
              >
                <div className="sharemodal__share-icon">
                  <Icon size={20} />
                </div>
                <span>{option.name}</span>
              </a>
            );
          })}
        </div>

        <div className="sharemodal__copy-link">
          <button
            onClick={handleCopyLink}
            className={`sharemodal__copy-link-btn ${copied ? 'sharemodal__copy-link-btn--copied' : ''}`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Enlace copiado' : 'Copiar enlace'}
          </button>
        </div>
      </div>
    </div>
  );
}
