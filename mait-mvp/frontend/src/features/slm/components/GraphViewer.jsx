
import React, { useEffect, useRef } from 'react';
import functionPlot from 'function-plot';

const GraphViewer = ({ data }) => {
    const rootEl = useRef(null);

    useEffect(() => {
        if (!data || !rootEl.current) return;

        try {
            const width = Math.min(500, rootEl.current.offsetWidth);

            const options = {
                target: rootEl.current,
                width: width,
                height: 300,
                grid: true,
                yAxis: { domain: [-10, 10] },
                xAxis: { domain: [-10, 10] },
                data: data.data || [] // Expecting { data: [ { fn: 'x^2' } ] }
            };

            // Allow custom range overrides
            if (data.range) {
                options.xAxis.domain = data.range;
            }

            functionPlot(options);

        } catch (e) {
            console.error("Graph rendering failed", e);
        }
    }, [data]);

    return (
        <div className="my-4 p-2 bg-white rounded-lg overflow-hidden shadow-lg">
            <div ref={rootEl} className="w-full flex justify-center" />
            <div className="text-center text-xs text-zinc-500 mt-2 font-mono">Interactive Verification Graph</div>
        </div>
    );
};

export default GraphViewer;
