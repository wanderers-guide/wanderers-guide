<template>
  <div id="main-container">
    <div id="main-top">
      <header>
        <div class="container-fluid pl-0">
          <div
            class="header d-md-flex justify-content-between align-items-center pt-1 pl-1 pr-5"
          >
            <!-- just threw in inline styles for the sake of speed. This needs to be refactored along with the header still -->
            <div style="display: flex; align-self: start">
              <a href="/"
                ><img
                  src="/images/logo.png"
                  style="height: 50px; align-self: top"
                  alt="Wanderer's Guide"
              /></a>
              <div
                style="padding-top: 8px"
                class="is-inline has-txt-value-number is-size-6-5 font-bebas-neue text-overflow-none is-hidden-mobile"
              >
                &nbsp&nbspBeta 1.9.3
              </div>
            </div>

            <div>
              <nav>
                <a class="icon is-medium nav-menu-toggle">
                  <i class="fa fa-2x fa-bars"></i>
                </a>
                <div id="mobile-nav-menu-container"></div>

                <ul class="nav-menu pt-1">
                  <div class="nav_home">
                    <li><a href="/">Home</a></li>
                  </div>

                  <div v-if="user" class="nav_characters">
                    <li class="mx-lg-4 mx-md-3 my-md-0 my-2">
                      <a href="/v/profile/characters" class="active"
                        >Characters</a
                      >
                    </li>
                  </div>
                  <span v-else class="ml-lg-4 ml-md-3"></span>

                  <div class="nav_builds">
                    <li><a href="/builds">Builds</a></li>
                  </div>

                  <div class="nav_homebrew">
                    <li class="mx-lg-4 mx-md-3 my-md-0 my-2">
                      <a href="/homebrew">Homebrew</a>
                    </li>
                  </div>

                  <div class="nav_gm_tools">
                    <li><a href="/gm-tools">GM Tools</a></li>
                  </div>

                  <div class="nav_browse">
                    <li class="mx-lg-4 mx-md-3 my-md-0 my-2">
                      <a href="/browse"><i class="fas fa-lg fa-search"></i></a>
                    </li>
                  </div>

                  <li v-if="user" class="mr-4">
                    <a href="#" id="nav-profile-picture">
                      <object
                        class="profile-header-icon"
                        :data="user.thumbnail"
                        type="image/png"
                      >
                        <img
                          class="profile-header-icon"
                          src="/images/fb_profile_pic.png"
                          alt="Profile Image"
                        />
                      </object>
                    </a>
                    <ul>
                      <li>
                        <a href="/profile" class="drop-text"
                          ><i class="fas fa-user-circle"></i> Account
                        </a>
                      </li>
                      <li v-if="user.isAdmin">
                        <a href="/admin/panel" class="drop-text"
                          ><i class="fas fa-tools"></i> Admin Panel
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://discord.gg/kxCpa6G"
                          target="_blank"
                          class="drop-text"
                          ><i class="fab fa-discord"></i> Discord<sup
                            class="icon is-small"
                            ><i class="fas fa-xs fa-external-link-alt"></i></sup
                        ></a>
                      </li>
                      <li>
                        <a
                          href="https://www.patreon.com/wanderersguide"
                          target="_blank"
                          class="drop-text"
                          ><i class="fab fa-patreon"></i> Patreon<sup
                            class="icon is-small"
                            ><i class="fas fa-xs fa-external-link-alt"></i></sup
                        ></a>
                      </li>
                      <li>
                        <a href="/api_docs" class="drop-text"
                          ><i class="fas fa-cog"></i> API Docs
                        </a>
                      </li>
                      <li>
                        <a href="/license" class="drop-text"
                          ><i class="fas fa-scroll"></i> License
                        </a>
                      </li>
                      <li>
                        <a href="/auth/logout" class="drop-text"
                          ><i class="fas fa-sign-out-alt"></i> Logout
                        </a>
                      </li>
                    </ul>
                  </li>
                  <div v-else class="nav_login">
                    <li class="mr-4">
                      <a href="/auth/login"
                        >Login <i class="fas fa-sign-in-alt"></i
                      ></a>
                    </li>
                  </div>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </header>
      <div class="banner_w3lspvt-2"></div>
    </div>

    <div class="top-border"></div>

    <div id="center-body">
      <div class="container">
        <div
          class="columns is-mobile is-centered is-vcentered pt-3 is-marginless"
        >
          <div class="column is-5 is-paddingless" style="white-space: nowrap">
            <h1
              class="is-size-2 is-inline-block has-txt-value-string title-font"
            >
              Characters
            </h1>
            <span
              v-if="!user?.isPatreonMember"
              class="is-size-5 ml-3 has-tooltip-bottom has-tooltip-multiline has-txt-listing"
              data-tooltip="You can only have up to six characters at once. To get unlimited characters, support us and what we're doing on Patreon!"
              >({{ characterStore.characters.length }}/{{
                characterLimit
              }})</span
            >
          </div>
          <div class="column is-5 is-paddingless">
            <template v-if="canMakeCharacter">
              <a id="icon-character-import" class="is-size-3-5 is-pulled-right">
                <label for="input-character-import">
                  <span
                    class="icon is-large has-text-info has-tooltip-bottom"
                    data-tooltip="Import Character"
                  >
                    <i class="fas fa-upload cursor-clickable"></i>
                  </span>
                </label>
                <input
                  id="input-character-import"
                  type="file"
                  accept=".guidechar"
                />
              </a>
              <a
                class="is-size-3 is-pulled-right"
                href="/profile/characters/add"
                ><span
                  class="icon is-large has-text-info has-tooltip-bottom"
                  data-tooltip="Create Character"
                  ><i class="fas fa-user-plus"></i></span
              ></a>
            </template>
            <template v-else>
              <a class="is-size-3-5 is-pulled-right">
                <label for="input-character-import">
                  <span
                    class="icon is-large has-text-danger has-tooltip-bottom"
                    data-tooltip="Import Character"
                  >
                    <i class="fas fa-upload cursor-clickable"></i>
                  </span>
                </label>
              </a>
              <a class="is-size-3 is-pulled-right"
                ><span
                  class="icon is-large has-text-danger has-tooltip-bottom"
                  data-tooltip="Create Character"
                  ><i class="fas fa-user-times"></i></span
              ></a>

              <a
                href="https://www.patreon.com/bePatron?u=32932027"
                target="_blank"
                class="button is-rounded is-small is-hidden-mobile mt-2 mx-3 is-pulled-right"
                style="background-color: rgb(255, 66, 77); color: white"
              >
                <span class="icon is-small">
                  <i class="fab fa-patreon"></i>
                </span>
                <span>Become a patron</span>
              </a>
            </template>
          </div>
        </div>
        <hr />

        <div class="columns is-centered is-multiline is-marginless mb-2">
          <template v-for="character in characterStore.characters">
            <character-list-card
              :character="character"
              :can-make-character="canMakeCharacter"
              :character-limit="characterLimit"
            />
          </template>
          <div v-if="characterStore.characters.length === 0" class="column">
            <p class="has-text-centered is-italic">You have no characters.</p>
          </div>
        </div>
      </div>
    </div>

    <div id="character-pdf-container" class="is-hidden"></div>

    <footer id="wanderers-guide-footer">
      <div class="cpy-right text-center py-3">
        <p class="text-center is-size-7">
          Wanderer's Guide<sup class="icon is-small"
            ><i class="fas fa-xs fa-trademark"></i
          ></sup>
          <span class="has-txt-faded"> | </span>
          <a href="/license" target="_blank">Licenses and Policies</a>
          <span class="has-txt-faded"> | </span>
          <a class="has-tooltip-top" data-tooltip="wanderersguide2e@gmail.com"
            ><sub class="icon is-small"
              ><i class="far fa-lg fa-envelope"></i></sub
          ></a>
          <span class="has-txt-faded"> | </span>
          <a href="https://discord.gg/kxCpa6G" target="_blank"
            ><sub class="icon is-small"
              ><i class="fab fa-lg fa-discord"></i></sub
          ></a>
          <span class="has-txt-faded"> | </span>
          <a href="https://www.patreon.com/wanderersguide" target="_blank"
            ><sub class="icon is-small"
              ><i class="fab fa-lg fa-patreon"></i></sub
          ></a>
        </p>
      </div>
    </footer>
  </div>

  <!-- Right Quickview -->
  <div id="quickviewDefault" class="quickview">
    <div class="quickview-header">
      <p id="quickViewTitle" class="title is-size-5 has-txt-value-number"></p>
      <div class="is-inline-flex">
        <p id="quickViewTitleRight"></p>
        <p id="quickViewTitleClose"></p>
      </div>
    </div>
    <div class="quickview-body use-custom-scrollbar">
      <div id="quickViewContent" class="quickview-block pt-1 pb-3 px-3"></div>
    </div>
  </div>

  <!-- Left Quickview -->
  <div id="quickviewLeftDefault" class="quickview is-left">
    <div class="quickview-header">
      <p id="quickViewLeftTitle" class="title is-size-5 has-txt-value-number">
        Sheet Tools
      </p>
      <div class="is-inline-flex">
        <p id="quickViewLeftTitleClose"></p>
      </div>
    </div>
    <div class="quickview-body use-custom-scrollbar">
      <div class="quickview-block pb-3 px-3">
        <div class="tabs is-centered is-marginless">
          <ul class="quickViewLeft-Tabs">
            <li><a id="quickViewLeftTab-Toggleables">Toggleables</a></li>
            <li><a id="quickViewLeftTab-DiceRoller">Dice Roller</a></li>
            <li class="is-hidden">
              <a id="quickViewLeftTab-Campaign">Campaign</a>
            </li>
          </ul>
        </div>
        <div id="quickViewLeftContent" class="pt-3 pos-relative"></div>
      </div>
    </div>
    <div id="quickViewLeftOuterExtra" class=""></div>
  </div>

  <!-- Pre-Load Fonts -->
  <div class="font_preload" style="opacity: 0">
    <span class="pf-icon"></span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive } from "vue";
import { useCharacters } from "../../../stores/characters";
import { useUser } from "../../../stores/user";
import { setup, teardown } from "./../../../legacy-js/character-list.js";
import characterListCard from "./character-list-card.vue";
import WGModal from "../../../components/WGModal.vue";

onMounted(() => {
  setup();
});

onBeforeUnmount(() => {
  teardown();
});

const userStore = useUser();
const characterStore = useCharacters();

const user = userStore.user;

const characterLimit = user?.isPatreonMember ? Infinity : 6;
const canMakeCharacter = characterStore.characters.length < characterLimit;
</script>

<style></style>
