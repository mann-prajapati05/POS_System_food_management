import PaymentPanel from '../components/PaymentPanel';

export default function PaymentScreen({ order, processing, onConfirm, onBack }) {
  return (
    <section className="mx-auto max-w-2xl">
      <PaymentPanel order={order} processing={processing} onConfirm={onConfirm} onCancel={onBack} />
    </section>
  );
}
