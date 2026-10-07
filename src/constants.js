export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const CLASS_LETTER_ORDER = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж'];
export const STORAGE_KEY = 'schedule_viewer_data', FILTER_KEY = 'schedule_viewer_filter';

export const START_TIMES = { 0: '8:00', 1: '8:45', 2: '9:50', 3: '10:35', 4: '11:40', 5: '12:25', 6: '13:30', 7: '14:15' };
export const END_TIMES   = { 1: '8:45', 2: '9:30', 3: '10:35', 4: '11:20', 5: '12:25', 6: '13:10', 7: '14:15', 8: '15:00' };
export const MAX_PERIODS = 8;

export const RECT = { minX: 93.6, minY: 110.04, maxX: 830.04, maxY: 565.56 };
export const TOTAL_WIDTH = RECT.maxX - RECT.minX, TOTAL_HEIGHT = RECT.maxY - RECT.minY;
export const DAY_HEIGHT = TOTAL_HEIGHT / 5, X_DIV = TOTAL_WIDTH / 8, TOLERANCE = 2.0;
export const MAIN_SIZES = [10.52602481842041, 21.15945053100586], MAIN_SIZE_TOL = 0.01;
export const GRID = { xMin: 93.6, xMax: 830.04, yMin: 110.04, yMax: 565.56, cols: 8, rows: 20 };
GRID.colW = (GRID.xMax - GRID.xMin) / GRID.cols; GRID.rowH = (GRID.yMax - GRID.yMin) / GRID.rows;
export const CYR_UPPER = { 'а': 'А', 'б': 'Б', 'в': 'В', 'г': 'Г', 'д': 'Д', 'е': 'Е', 'ж': 'Ж' };
export const MAX_RETRIES = 3, RETRY_DELAY_MS = 2000;
