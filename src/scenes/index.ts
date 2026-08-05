import type { ComponentType } from 'react';
import type { SceneProps } from './shared';
import type { SceneType } from '../core/content';
import TraceScene from './TraceScene';
import MatchScene from './MatchScene';
import SortScene from './SortScene';
import CountScene from './CountScene';
import PatternScene from './PatternScene';
import PhonicsScene from './PhonicsScene';
import ShapeScene from './ShapeScene';
import FreedrawScene from './FreedrawScene';
import PopScene from './PopScene';
import FeedScene from './FeedScene';
import FishScene from './FishScene';
import MemoryScene from './MemoryScene';
import HideScene from './HideScene';

export const SCENES: Record<SceneType, ComponentType<SceneProps>> = {
  trace: TraceScene,
  match: MatchScene,
  sort: SortScene,
  count: CountScene,
  pattern: PatternScene,
  phonics: PhonicsScene,
  shape: ShapeScene,
  freedraw: FreedrawScene,
  pop: PopScene,
  feed: FeedScene,
  fish: FishScene,
  memory: MemoryScene,
  hide: HideScene,
};
