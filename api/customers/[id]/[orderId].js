// Tạm thời trong api/customers/[id]/[orderId].js để test
export default async function handler(req, res) {
    console.log(`[Test DELETE API] Received customerId: ${req.query.id}, orderId: ${req.query.orderId}`);
    if (req.method === 'DELETE') {
        res.status(200).json({ message: "Test DELETE received", customerId: req.query.id, orderId: req.query.orderId });
    } else {
        res.setHeader('Allow', ['DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
