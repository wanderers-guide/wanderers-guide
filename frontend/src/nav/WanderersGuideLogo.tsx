import { useNavigate } from 'react-router-dom';
import Logo from '../assets/images/logo.png';
import { Group, Image } from '@mantine/core';
import LogoIcon from '@assets/images/LogoIcon';
import { useRecoilValue } from 'recoil';
import { characterState } from '@atoms/characterAtoms';
import { GUIDE_BLUE } from '@constants/data';
import { getCachedCustomization } from '@content/customization-cache';
import { useEffect } from 'react';
import { renderToString } from 'react-dom/server';

export default function WanderersGuideLogo(props: { size: number }) {
  const navigate = useNavigate();

  const activeCharacer = useRecoilValue(characterState);
  const color =
    activeCharacer?.details?.sheet_theme?.color || getCachedCustomization()?.sheet_theme?.color || GUIDE_BLUE;

  const setFavicon = (svg: string) => {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };
  useEffect(() => {
    setFavicon(renderToString(<LogoIcon size={512} color={color} />));
  }, [color]);

  return (
    <Group gap={5} wrap='nowrap'>
      <LogoIcon color={color} size={props.size} />
      <Image
        radius='md'
        h={props.size}
        w={5.6 * props.size} // Maintain aspect ratio of original logo
        src={Logo}
        alt="Wanderer's Guide"
        style={{
          objectFit: 'contain',
          objectPosition: 'center',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/')}
      />
    </Group>
  );
}
