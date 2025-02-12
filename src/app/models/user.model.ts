export interface User {
  _id?: string; // Use _id as the MongoDB identifier
  id?: string; // If you want to use `id` separately for other purposes (e.g., frontend)
  username: string;
  password?: string; // Sensitive field should not be exposed in some cases
}
