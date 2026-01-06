import { useState, useEffect } from 'react';
import { X, ExternalLink, Tag, Clock, Star } from 'lucide-react';
import { bannerService, Banner } from '../../services/bannerService';
import { Link } from 'react-router-dom';

export function MarketingPopup() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkBanner = async () => {
      // Logic for "Show Once" could utilize localStorage here if we want to respect it
      // For now, we fetch and show if active.
      const activeBanner = await bannerService.getActiveBanner();
      
      if (activeBanner) {
        // Optional: specific session check here
        // const hasSeen = sessionStorage.getItem(`seen_banner_${activeBanner.id}`);
        // if (!hasSeen) {
           setBanner(activeBanner);
           // Delay slightly for smooth entrance
           setTimeout(() => setIsVisible(true), 1000);
        // }
      }
    };

    checkBanner();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    if (banner) {
      sessionStorage.setItem(`seen_banner_${banner.id}`, 'true');
    }
  };

  if (!banner) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={handleClose}
      >
        {/* Modal Content */}
        <div 
          className={`relative bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden transform transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="absolute top-2 right-2 z-10 p-1 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          {/* Banner Content */}
          {/* Banner Content */}
          <div className="flex flex-col">
            {/* Conditional Rendering based on Type */}
            {banner.banner_type === 'image' && banner.image_url ? (
                <div className="relative aspect-[4/3] w-full bg-gray-100">
                   <img 
                     src={banner.image_url} 
                     alt={banner.title}
                     className="w-full h-full object-cover"
                   />
                </div>
            ) : (
                <div className={`relative w-full p-8 text-center text-white flex flex-col items-center justify-center min-h-[300px] bg-gradient-to-br ${
                    banner.banner_type === 'discount' ? 'from-pink-500 via-rose-500 to-red-600' :
                    banner.banner_type === 'last_minute' ? 'from-orange-500 via-red-500 to-amber-600' :
                    'from-indigo-600 via-purple-600 to-violet-600' // exclusive
                }`}>
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        {/* Icon */}
                        <div className="mb-4 p-4 bg-white/20 rounded-full backdrop-blur-sm shadow-xl">
                            {banner.banner_type === 'discount' && <Tag size={48} className="text-white drop-shadow-md" />}
                            {banner.banner_type === 'last_minute' && <Clock size={48} className="text-white drop-shadow-md" />}
                            {banner.banner_type === 'exclusive' && <Star size={48} className="text-white drop-shadow-md" />}
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl md:text-4xl font-extrabold mb-2 drop-shadow-lg tracking-tight leading-tight">
                            {banner.custom_title || banner.title}
                        </h2>

                        {/* Description */}
                        {banner.custom_description && (
                            <div 
                              className="text-lg md:text-xl font-medium mb-6 opacity-95 drop-shadow-md max-w-sm leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: banner.custom_description }}
                            />
                        )}

                        {/* Specific Content */}
                        {banner.banner_type === 'discount' && banner.discount_percent && (
                            <div className="mb-6 transform -rotate-2">
                                <span className="inline-block bg-white text-rose-600 px-6 py-2 text-4xl font-black rounded-lg shadow-xl cursor-default hover:scale-105 transition-transform">
                                    {banner.discount_percent}% OFF
                                </span>
                            </div>
                        )}

                        {banner.banner_type === 'last_minute' && (banner.book_title || banner.book_author) && (
                            <div className="mb-6 bg-black/20 p-4 rounded-lg backdrop-blur-md border border-white/10 w-full max-w-xs">
                                {banner.book_title && <h3 className="text-xl font-bold font-serif italic mb-1">"{banner.book_title}"</h3>}
                                {banner.book_author && <p className="text-sm font-medium uppercase tracking-wider opacity-80">{banner.book_author}</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {(banner.link_url) && (
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 text-center">
                 {banner.link_url.startsWith('/') ? (
                    <Link 
                      to={banner.link_url} 
                      className={`inline-flex items-center justify-center w-full px-6 py-3 text-lg font-bold text-white rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all
                        ${banner.banner_type === 'discount' ? 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700' : 
                          banner.banner_type === 'last_minute' ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700' :
                          banner.banner_type === 'exclusive' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' :
                          'bg-blue-600 hover:bg-blue-700'
                        }
                      `}
                      onClick={handleClose}
                    >
                      {banner.banner_type === 'image' ? 'Ver Oferta' : '¡Lo Quiero!'}
                    </Link>
                 ) : (
                    <a 
                      href={banner.link_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center w-full px-6 py-3 text-lg font-bold text-white rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all
                        ${banner.banner_type === 'discount' ? 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700' : 
                          banner.banner_type === 'last_minute' ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700' :
                          banner.banner_type === 'exclusive' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' :
                          'bg-blue-600 hover:bg-blue-700'
                        }
                      `}
                      onClick={handleClose}
                    >
                      {banner.banner_type === 'image' ? 'Ver Oferta' : 'Aprovechar Oferta'} <ExternalLink size={18} className="ml-2"/>
                    </a>
                 )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
