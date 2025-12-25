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
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

export function StripePaymentForm({ amount, onSuccess, onError }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
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
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('unknownError');
      setErrorMessage(message);
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
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
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
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
  );
}
