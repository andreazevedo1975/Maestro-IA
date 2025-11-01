import React, { useState } from 'react';
import { ChevronUpIcon } from './icons/ChevronUpIcon.js';

type AccordionSectionProps = {
    title: string;
    children?: React.ReactNode;
    defaultOpen?: boolean;
};

export const AccordionSection = ({ title, children, defaultOpen = false }: AccordionSectionProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg mb-4 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 bg-gray-800/70 hover:bg-gray-700/50 transition"
            >
                <h3 className="text-xl font-bold font-teko tracking-wider uppercase text-white">{title}</h3>
                <ChevronUpIcon className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-0' : 'rotate-180'}`} />
            </button>
            <div className={`accordion-content ${isOpen ? 'accordion-content-open' : ''}`}>
                <div className="p-4 md:p-6 text-gray-300">
                    {children}
                </div>
            </div>
        </div>
    );
};
