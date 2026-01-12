import React, { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { CreditCard, Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface StripePaymentFormProps {
  amount: number;
  onSuccess: (paymentIntentId: string) => Promise<void> | void;
  onError: (error: string) => void;
}

export function StripePaymentForm({ amount, onSuccess, onError }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isReady, setIsReady] = useState(false); // New state for PaymentElement readiness

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Ensure PaymentElement is ready before confirming payment
    if (!isReady) {
        console.warn("PaymentElement not ready yet.");
        return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/pago-completado`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || t('errorProcessingPaymentGeneric'));
        onError(error.message || t('errorProcessingPaymentGeneric'));
        setIsProcessing(false); // Enable retry on error
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Keep isProcessing=true while we handle the success (create order, etc.)
        // This keeps the overlay active until the parent component navigates away.
        await onSuccess(paymentIntent.id);
        // We DON'T set isProcessing(false) here if successful,
        // to prevent UI flicker before navigation.
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('unknownError');
      setErrorMessage(message);
      onError(message);
      setIsProcessing(false);
    }
  };

  return (
    <>
      {isProcessing && (
        <div className="payment-processing-overlay">
          <div className="processing-content">
            <div className="processing-spinner"></div>
            <div className="processing-title">{t('processingPayment')}</div>
            <p className="processing-text">
              {t('pleaseWaitDoNotClose')}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="stripe-payment-form">
        <div className="payment-header">
          <CreditCard size={24} />
          <h3>{t('paymentInformation')}</h3>
        </div>

        <div className="payment-amount">
          <span>{t('totalToPay')}:</span>
          <span className="amount">€{amount.toFixed(2)}</span>
        </div>

        <div className="payment-element-container">
          <PaymentElement onReady={() => setIsReady(true)} />
        </div>

        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || isProcessing || !isReady}
          className="pay-button"
        >
          {isProcessing ? (
            <>
              <span className="spinner"></span>
              {t('processingPayment')}
            </>
          ) : (
            <>
              <Lock size={18} />
              {t('payAmount')} €{amount.toFixed(2)}
            </>
          )}
        </button>

        <div className="security-notice">
          <Lock size={14} />
          <span>{t('securePaymentByStripe')}</span>
        </div>
      </form>
    </>
  );
}
