import React from 'react';
import { Composition } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { FPS, H, W } from './theme';
import * as S from './scenes';

const T = 15; // 장면 전환 길이(프레임)

const SCENES: Array<{ C: React.FC; d: number; enter?: 'fade' | 'slide' }> = [
  { C: S.Intro, d: S.INTRO },
  { C: S.TitleScene, d: S.TITLE, enter: 'fade' },
  { C: S.ListenScene, d: S.LISTEN, enter: 'slide' },
  { C: S.MakeScene, d: S.MAKE, enter: 'slide' },
  { C: S.ScoreScene, d: S.SCORE, enter: 'slide' },
  { C: S.NuisanceScene, d: S.NUISANCE, enter: 'slide' },
  { C: S.PrincipleScene, d: S.PRINCIPLE, enter: 'fade' },
  { C: S.OutroScene, d: S.OUTRO, enter: 'fade' },
];

export const TOTAL = SCENES.reduce((s, x) => s + x.d, 0) - T * (SCENES.length - 1);

const IntroVideo: React.FC = () => (
  <TransitionSeries>
    {SCENES.map(({ C, d, enter }, i) => (
      <React.Fragment key={i}>
        {enter && (
          <TransitionSeries.Transition
            presentation={enter === 'slide' ? slide({ direction: 'from-right' }) : fade()}
            timing={linearTiming({ durationInFrames: T })}
          />
        )}
        <TransitionSeries.Sequence durationInFrames={d}>
          <C />
        </TransitionSeries.Sequence>
      </React.Fragment>
    ))}
  </TransitionSeries>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Intro" component={IntroVideo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
  </>
);
