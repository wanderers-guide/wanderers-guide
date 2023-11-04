import { BackgroundImage, MantineProvider } from "@mantine/core";
import { theme } from "./theme";
import Layout from "./nav/Layout";
import { Outlet } from "react-router-dom";
import { useRecoilState, useRecoilValue } from "recoil";
import { backgroundState } from "@atoms/navAtoms";
import Bg1 from "@assets/images/backgrounds/1.png";
import { useEffect, useState } from "react";
import { supabase } from "./main";
import { sessionState } from "@atoms/supabaseAtoms";
import SearchSpotlight from "@nav/SearchSpotlight";
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from "@mantine/modals";
import { SelectContentModal } from "@common/select/SelectContent";
import { UpdateCharacterPortraitModal } from '@modals/UpdateCharacterPortraitModal';


const modals = {
  selectContent: SelectContentModal,
  updateCharacterPortrait: UpdateCharacterPortraitModal,
  /* ...other modals */
};
declare module '@mantine/modals' {
  export interface MantineModalsOverride {
    modals: typeof modals;
  }
}

export default function App() {
  
  const [session, setSession] = useRecoilState(sessionState);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const backgroundIndex = useRecoilValue(backgroundState);
  const Background = backgroundIndex !== null ? Bg1 : null;

  return (
    <MantineProvider theme={theme} defaultColorScheme='dark'>
      <ModalsProvider modals={modals}>
        {Background && (
          <BackgroundImage
            src={Background}
            radius={0}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: -1000 }}
            w='100vw'
            h='100vh'
          />
        )}
        <SearchSpotlight />
        <Notifications position='top-right' />
        <Layout>
          {/* Outlet is where react-router will render child routes */}
          <Outlet />
        </Layout>
      </ModalsProvider>
    </MantineProvider>
  );
}
