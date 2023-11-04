import { makeRequest } from "@requests/request-manager";

export async function uploadImage(file: File, category: string): Promise<string> {
  const result = await makeRequest<{ url: string } | null>('upload-public-file', {
    data: (await toBase64(file)).split(';base64,')[1],
    category: category,
    type: file.type.split('/')[1],
  });
  return result?.url ?? '';
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
