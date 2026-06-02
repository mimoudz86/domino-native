import type { Domino } from '../shared/Domino';

export type TrainLineType =
    | 'main-line'
    | 'upper-line'
    | 'lower-line'
    | 'left_up-position'
    | 'right_down-position';

export interface TrainSlot {
    domino: Domino;
    line: TrainLineType;
    index: number;
}

export interface TrainState {
    trainSlots: TrainSlot[];
    trainWidth: number;
    mainLineActive: boolean;
    pivotLeftActive: boolean;
    pivotRightActive: boolean;
    upperLineActive: boolean;
    lowerLineActive: boolean;
}