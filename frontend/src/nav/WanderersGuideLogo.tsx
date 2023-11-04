
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/images/logo.png';
import { Image } from '@mantine/core';

export default function WanderersGuideLogo(props: { size: number }) {
  const navigate = useNavigate();

  return (
    <Image
      radius="md"
      h={props.size}
      src={Logo}
      alt="Wanderer's Guide"
      style={{
        objectFit: 'contain',
        objectPosition: 'center',
        cursor: 'pointer',
      }}
      onClick={() => navigate('/')}
    />
  );

}
