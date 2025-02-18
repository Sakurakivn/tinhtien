// api/orders.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI; // Lấy URI từ biến môi trường
const client = new MongoClient(uri);

export default async function handler(req, res) {
    await client.connect();
    const database = client.db('your_database_name'); // Thay thế bằng tên database của bạn
    const ordersCollection = database.collection('orders');

    if (req.method === 'POST') {
        // Lưu đơn hàng
        const order = req.body;
        const result = await ordersCollection.insertOne(order);
        res.status(201).json(result);
    } else if (req.method === 'GET') {
        // Lấy danh sách đơn hàng
        const orders = await ordersCollection.find({}).toArray();
        res.status(200).json(orders);
    } else {
        res.setHeader('Allow', ['POST', 'GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
