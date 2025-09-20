import { URLS } from './constants';
import { LanguageInfo } from '../interfaces/types';

export const ARCAD_LANGUAGE_MAP: Record<string, LanguageInfo> = {
    'french': { name: 'French', url: 'https://www.arcadsoftware.com/fr/' },
    'français': { name: 'French', url: 'https://www.arcadsoftware.com/fr/' },
    'frace': { name: 'French', url: 'https://www.arcadsoftware.com/fr/' }, // Typo for French
    'spanish': { name: 'Spanish', url: 'https://www.arcadsoftware.com/es/' },
    'german': { name: 'German', url: 'https://www.arcadsoftware.com/de/' },
    'italian': { name: 'Italian', url: 'https://www.arcadsoftware.com/it/' },
    'japanese': { name: 'Japanese', url: 'https://www.arcadsoftware.com/ja/' },
    'india': { name: 'India', url: 'https://www.arcadsoftware.com/about/contact-us/' }, // No specific language, use contact page
    'idnia': { name: 'India', url: 'https://www.arcadsoftware.com/about/contact-us/' }, // Typo for India
    'france': { name: 'French', url: 'https://www.arcadsoftware.com/fr/' },
    'english': { name: 'English', url: URLS.PRODUCTS },
    'neng': { name: 'English', url: URLS.PRODUCTS }, // Typo for English
};