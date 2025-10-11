// Function to generate unique 6-character code from receipt ID
// This ensures consistency between frontend and backend
export const generateUniqueCode = (receiptId) => {
  if (!receiptId) return 'N/A';
  
  // Debug logging to verify the receipt ID being used
  console.log('Generating unique code from receipt ID:', receiptId);
  
  // Create a hash from the receipt ID using a more robust hashing algorithm
  let hash = 0;
  for (let i = 0; i < receiptId.length; i++) {
    const char = receiptId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and convert to base36 for alphanumeric characters
  const absHash = Math.abs(hash);
  const base36 = absHash.toString(36).toUpperCase();
  
  // Take first 6 characters and pad if necessary
  let code = base36.substring(0, 6);
  if (code.length < 6) {
    // Pad with additional characters from the hash
    const padded = (absHash * 31).toString(36).toUpperCase();
    code = (code + padded).substring(0, 6);
  }
  
  // Ensure we have exactly 6 alphanumeric characters
  const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  while (code.length < 6) {
    const randomIndex = Math.abs(hash + code.length) % alphanumeric.length;
    code += alphanumeric[randomIndex];
  }
  
  const finalCode = code.substring(0, 6);
  console.log('Generated unique code:', finalCode);
  
  return finalCode;
};
