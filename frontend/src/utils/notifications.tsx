import { hideNotification, showNotification, updateNotification } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

type NotificationDetails = {
  title: string;
  message: string;
  color: string;
};

export default async function displayNotification(
  id: string,
  fn: () => Promise<{ status: string; title: string; message: string }>,
  loading: NotificationDetails,
  success: NotificationDetails,
  error: NotificationDetails
) {
  hideNotification(id);
  showNotification({
    id: id,
    loading: true,
    title: loading.title,
    message: loading.message,
    color: loading.color,
    autoClose: false,
  });

  const showError = (title: string, message: string) => {
    updateNotification({
      id: id,
      autoClose: false,
      title,
      message,
      color: error.color,
      icon: <IconX />,
    });
  };

  let result = await fn();

  if (result.status === 'success') {
    updateNotification({
      id: id,
      autoClose: 3000,
      title: success.title,
      message: success.message,
      color: success.color,
      icon: <IconCheck />,
    });
  } else if (result.status === 'error') {
    console.warn(`Error: ${result.title}, ${result.message}`);
    showError(result.title, result.message);
  } else {
    console.error(`Unknown Status (${result.status}): ${result.title}, ${result.message}`);
    showError(error.title, error.message);
  }
}


export function throwError(message: string){
  displayError(message);
  throw new Error(message);
}

export function displayError(message: string) {
  const id = message;
  hideNotification(id);
  showNotification({
    id: id,
    title: 'Error',
    message: message,
    autoClose: false,
    color: 'red',
    icon: <IconX />,
  });
}
