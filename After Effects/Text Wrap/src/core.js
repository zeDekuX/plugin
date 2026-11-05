/* Text Area: pure geometry and layout. Coordinates are Cartesian (+Y up).
 * No temporal state, no glyph synthesis, no word splitting, no font scaling.
 */
var TextAreaCore = (function () {
    'use strict';
    var EPS = 1e-7;
    function finite(v, name) { if (!isFinite(v)) throw new Error(name + ' must be finite.'); return v; }
    function merge(intervals) {
        var out=[];
        intervals.sort(function(a,b){return a[0]-b[0];});
        intervals.forEach(function(s){
            if(s[1]-s[0]<=EPS)return;
            var last=out[out.length-1];
            if(last&&s[0]<=last[1]+EPS)last[1]=Math.max(last[1],s[1]);
            else out.push(s.slice());
        });return out;
    }
    function subtract(available, blocked) {
        blocked=merge(blocked);var out=[];
        available.forEach(function(a){
            var x=a[0];
            blocked.forEach(function(b){if(b[1]<=x||b[0]>=a[1])return;if(b[0]>x)out.push([x,Math.min(b[0],a[1])]);x=Math.max(x,b[1]);});
            if(x<a[1]-EPS)out.push([x,a[1]]);
        });return out;
    }
    function intersect(a,b) {
        var out=[];a.forEach(function(x){b.forEach(function(y){var l=Math.max(x[0],y[0]),r=Math.min(x[1],y[1]);if(r>l+EPS)out.push([l,r]);});});return merge(out);
    }
    function midpoint(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
    function distanceToSegment(p,a,b) {
        var dx=b.x-a.x,dy=b.y-a.y,t=((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1);
        t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
    }
    // A Bezier lies within its control polygon's convex hull. The flatness
    // bound includes distance to the finite chord (also covers loops/cusps).
    function flatten(data,tolerance) {
        finite(tolerance,'Curve tolerance');if(tolerance<=0)throw new Error('Curve tolerance must be positive.');
        var edges=[],cur=null,start=null,open=false,bounds={left:Infinity,right:-Infinity,top:-Infinity,bottom:Infinity};
        function edge(a,b){
            [a,b].forEach(function(p){finite(p.x,'Path X');finite(p.y,'Path Y');bounds.left=Math.min(bounds.left,p.x);bounds.right=Math.max(bounds.right,p.x);bounds.top=Math.max(bounds.top,p.y);bounds.bottom=Math.min(bounds.bottom,p.y);});
            edges.push([a,b]);if(edges.length>200000)throw new Error('Area is too complex (200000 edge limit).');
        }
        function bezier(points,depth){
            var flat=true;
            for(var i=1;i<points.length-1;i++)if(distanceToSegment(points[i],points[0],points[points.length-1])>tolerance)flat=false;
            if(flat){edge(points[0],points[points.length-1]);return;}
            if(depth>=24)throw new Error('Area curve subdivision limit reached.');
            var levels=[points],left=[points[0]],right=[points[points.length-1]];
            while(levels[levels.length-1].length>1){var p=levels[levels.length-1],q=[];for(var k=0;k<p.length-1;k++)q.push(midpoint(p[k],p[k+1]));levels.push(q);left.push(q[0]);right.push(q[q.length-1]);}
            bezier(left,depth+1);bezier(right.reverse(),depth+1);
        }
        function rational(h,depth){
            var p=h.map(function(v){return {x:v.x/v.w,y:v.y/v.w};});
            if(distanceToSegment(p[1],p[0],p[2])<=tolerance){edge(p[0],p[2]);return;}
            if(depth>=24)throw new Error('Area conic subdivision limit reached.');
            function half(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,w:(a.w+b.w)/2};}
            var a=half(h[0],h[1]),b=half(h[1],h[2]),c=half(a,b);
            rational([h[0],a,c],depth+1);rational([c,b,h[2]],depth+1);
        }
        data.forEach(function(v){
            if(v.type==='moveTo'){if(open)throw new Error('Area must contain closed contours.');cur=v.point;start=cur;open=true;}
            else if(v.type==='close'){if(open)edge(cur,start);open=false;cur=start;}
            else {
                if(!open)throw new Error('Malformed Area contour.');
                if(v.type==='lineTo')edge(cur,v.point);
                else if(v.type==='quadTo')bezier([cur,v.cp1,v.point],0);
                else if(v.type==='cubicTo')bezier([cur,v.cp1,v.cp2,v.point],0);
                else if(v.type==='conicTo'){
                    finite(v.weight,'Conic weight');if(v.weight<0)throw new Error('Negative conic weights are unsupported. Convert to Bezier curves first.');
                    if(v.weight===0)edge(cur,v.point);
                    else rational([{x:cur.x,y:cur.y,w:1},{x:v.cp1.x*v.weight,y:v.cp1.y*v.weight,w:v.weight},{x:v.point.x,y:v.point.y,w:1}],0);
                }
                else throw new Error('Unsupported Area path verb: '+v.type+'. Convert to Bezier curves first.');
                cur=v.point;
            }
        });if(open)throw new Error('Area must contain closed contours.');return {edges:edges,bounds:bounds};
    }
    function scanIntervals(edges,y,contains) {
        var xs=[];
        edges.forEach(function(e){var a=e[0],b=e[1];if((a.y>y)!==(b.y>y))xs.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));});
        xs.sort(function(a,b){return a-b;});var out=[];
        for(var i=0;i<xs.length-1;i++)if(xs[i+1]-xs[i]>EPS&&contains((xs[i]+xs[i+1])/2,y))out.push([xs[i],xs[i+1]]);
        return merge(out);
    }
    // Project ALL boundary edges in the expanded row band onto X and remove
    // their projections from the midpoint interior intervals. A remaining
    // rectangle has no boundary anywhere in its height, including tiny holes.
    // Expanding by curve tolerance keeps the test conservative for curves.
    function bandSegments(geometry,top,bottom,padding,tolerance,contains) {
        finite(padding,'Padding');if(padding<0)throw new Error('Padding must be nonnegative.');
        var safety=padding+tolerance,hi=top+safety-EPS,lo=bottom-safety+EPS,mid=(top+bottom)/2;
        var available=scanIntervals(geometry.edges,mid,contains),blocked=[];
        geometry.edges.forEach(function(e){
            var a=e[0],b=e[1],min=Math.min(a.y,b.y),max=Math.max(a.y,b.y);
            if(max<lo||min>hi)return;
            var x1=a.x,x2=b.x;
            if(Math.abs(b.y-a.y)>EPS){
                var t1=Math.max(0,Math.min(1,(lo-a.y)/(b.y-a.y))),t2=Math.max(0,Math.min(1,(hi-a.y)/(b.y-a.y)));
                var tl=Math.min(t1,t2),tr=Math.max(t1,t2);x1=a.x+(b.x-a.x)*tl;x2=a.x+(b.x-a.x)*tr;
            }
            blocked.push([Math.min(x1,x2)-safety,Math.max(x1,x2)+safety]);
        });return subtract(available,blocked);
    }
    function tokens(text) {
        // NBSP/narrow NBSP stay inside a logical word. Ordinary whitespace is
        // a break opportunity; original inter-word gaps come from native text.
        return String(text).replace(/\r\n?/g,'\n').split('\n').map(function(line){
            return line.split(/[\t\v\f \u1680\u2000-\u200a\u2028\u2029\u205f\u3000]+/).filter(function(w){return w.length>0;});
        });
    }
    function flow(paragraphs,rows,options) {
        var result={placements:[],fragments:[],overflow:[],totalWords:0,placedWords:0,reason:null};
        paragraphs.forEach(function(p){result.totalWords+=p.length;});
        var rowIndex=0,extraY=0,stop=false,squeeze=options.minGap||1;
        for(var p=0;p<paragraphs.length;p++){
            var words=paragraphs[p],wi=0;
            if(!words.length){rowIndex++;extraY+=options.paragraphSpacing||0;continue;}
            while(wi<words.length&&rowIndex<rows.length){
                var row=rows[rowIndex++],baseline=row.baseline-extraY;
                var segments=options.segmentsAt?options.segmentsAt(baseline,row):row.segments;
                var rowFragments=[];
                for(var si=0;si<segments.length&&wi<words.length;si++){
                    var segment=segments[si],width=segment[1]-segment[0],indices=[],used=0,tight=0;
                    // Justified lines may close their gaps down to minGap to fit one more word.
                    while(wi<words.length){var w=words[wi],gap=indices.length?words[wi-1].gapAfter:0;
                        if(tight+gap*squeeze+w.width>width+EPS)break;
                        used+=gap+w.width;tight+=gap*squeeze+w.width;indices.push(wi++);
                    }
                    if(indices.length)rowFragments.push({paragraph:p,row:row.index===undefined?rowIndex-1:row.index,segment:si,left:segment[0],right:segment[1],baseline:baseline,indices:indices,used:used});
                }
                var final=wi===words.length;
                rowFragments.forEach(function(f){
                    var justify=options.alignment===3&&(!final||options.justifyFinal),room=f.right-f.left-f.used,spare=Math.max(0,room);
                    var add=(justify||room<0)&&f.indices.length>1?room/(f.indices.length-1):0;
                    var offset=options.alignment===1?spare/2:options.alignment===2?spare:0,x=f.left+offset;
                    f.finalLine=final;f.extraGap=add;
                    f.indices.forEach(function(index,i){
                        var w=words[index];result.placements.push({paragraph:p,word:index,token:w.token,key:w.key,x:x,baseline:f.baseline,width:w.width,row:f.row,segment:f.segment});
                        x+=w.width+(i<f.indices.length-1?w.gapAfter+add:0);
                    });result.fragments.push(f);
                });
            }
            if(wi<words.length){
                for(var q=p;q<paragraphs.length;q++)for(var j=q===p?wi:0;j<paragraphs[q].length;j++)result.overflow.push({paragraph:q,word:j,token:paragraphs[q][j].token});
                result.reason='Text does not fit the remaining row segments; flow stops at the first unplaced whole word.';stop=true;break;
            }
            extraY+=options.paragraphSpacing||0;
        }
        result.placedWords=result.placements.length;
        if(stop&&options.overflowPolicy===1)throw new Error('Text Area overflow: '+result.overflow.length+' words remain, beginning with "'+result.overflow[0].token+'".');
        return result;
    }
    return {merge:merge,intersect:intersect,subtract:subtract,flatten:flatten,bandSegments:bandSegments,tokens:tokens,flow:flow};
})();
