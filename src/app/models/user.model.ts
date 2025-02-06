export interface User {
  id?: string; // Use id consistently
  _id?: string; // Include _id to map from the database
  username: string;
  password: string;
}
