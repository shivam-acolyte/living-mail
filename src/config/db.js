import { connectPostgres } from "./postgres.js";

const connectDB = async () => {
  await connectPostgres({ required: true });
};

export default connectDB;
