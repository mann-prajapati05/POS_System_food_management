import PaymentPanel from '../components/PaymentPanel';

export default function PaymentScreen({ order, processing, onConfirm, onBack }) {
  return (
    <section className="mx-auto max-w-[520px] py-8 animate-fade-in">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-linen-text-secondary transition-colors hover:text-linen-text-primary"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Order Screen
      </button>
      <PaymentPanel order={order} processing={processing} onConfirm={onConfirm} onCancel={onBack} />
    </section>
  );
}
