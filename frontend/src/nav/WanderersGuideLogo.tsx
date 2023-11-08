
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/images/logo.png';
import { Group, Image } from '@mantine/core';
import LogoIcon from '@assets/images/LogoIcon';
import { useRecoilValue } from 'recoil';
import { characterState } from '@atoms/characterAtoms';
import { GUIDE_BLUE } from '@constants/data';

export default function WanderersGuideLogo(props: { size: number }) {
  const navigate = useNavigate();

  const activeCharacer = useRecoilValue(characterState);

  return (
    <Group gap={5} wrap='nowrap'>
      <LogoIcon
        color={activeCharacer?.details?.sheet_theme?.color || GUIDE_BLUE}
        size={props.size}
      />
      <Image
        radius='md'
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
    </Group>
  );

}
