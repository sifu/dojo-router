var Router = (function(){

    dojo.require( 'dojo.hash' );

    var publish = dojo.publish;
    var forEach = dojo.forEach;

    function Router( initial ) {
        var self = {};
        var PATH_REPLACER = "([^\/]+)";
        var PATH_NAME_MATCHER = /:([\w\d]+)/g;
        var QUERY_STRING_MATCHER = /\?([^#]*)$/;
        function init( ) {
            self.routes = [];
            dojo.subscribe( '/dojo/hashchange', self._runRoute );
            self.initial = initial || '/';
            return self;
        }
        self.route = function( path, name, defaultParamsOrFunction, defaultParams ) {
            var default_params
            if( typeof( defaultParamsOrFunction ) === 'function' ) {
                default_params = defaultParams;
                dojo.subscribe( 'router/' + name, defaultParamsOrFunction );
            } else {
                default_params = defaultParamsOrFunction;
            }
            var param_names = [];
            PATH_NAME_MATCHER.lastIndex = 0;
            // find the names
            while( ( path_match = PATH_NAME_MATCHER.exec( path ) ) !== null ) {
                param_names.push( path_match[ 1 ] );
            } 
            originalPath = path;
            path = new RegExp("^" + path.replace(PATH_NAME_MATCHER, PATH_REPLACER) + "$");
            self.routes.push( {
                path: path,
                originalPath: originalPath,
                param_names: param_names,
                name: name,
                params: default_params || {}
            } );
            return self;
        };
        self.run = function( ) {
            var current = dojo.hash( );
            if( current === '' ) {
                dojo.hash( self.initial )
            } else {
                self._runRoute( current );
            }
        };
        self.urlFor = function( name, params ) {
            var i=0, entry, segment_key;
            var query = {};
            while( entry = self.routes[ i ] ) {
                if( entry.name === name ) {
                    var url = '#' + entry.originalPath;
                    for( var key in params || {} ) {
                        segment_key = ':' + key;
                        if( url.indexOf( segment_key ) > -1 ) {
                            url = url.replace( ':' + key, params[ key ] );
                        } else {
                            query[ key ] = params[ key ];
                        }
                    }
                    if( dojo.toJson( query  ) !== "{}" ) {
                        url = url + '?' + dojo.objectToQuery( query );
                    }
                    return url;
                }
                i++;
            }
        };
        self.redirectTo = function( name, params ) {
            dojo.hash( self.urlFor( name, params ) );
        };
        self._runRoute = function( url ) {
            var i=0, entry, path_params;
            while( entry = self.routes[ i ] ) {
                if( self._routablePath( url ).match( entry.path ) ) {
                    var params = dojo.mixin( {}, entry.params );
                    params = dojo.mixin( params, self._parseQueryString( url ) );
                    if( ( path_params = entry.path.exec( self._routablePath( url ) ) ) !== null ) {
                        // first match is the full path
                        path_params.shift( );
                        // for each of the matches
                        forEach( path_params, function( param, i ) {
                            // if theres a matching param name
                            if( entry.param_names[ i ] ) {
                                // set the name to the match
                                params[ entry.param_names[ i ] ] = decodeURIComponent( param );
                            }
                        } );
                    }
                    publish( 'router/' + entry.name, [ params ] );
                    publish( 'router/-run-route', [ url, entry.name, params ] );
                }
                i++;
            }
        };
        self._routablePath = function( path ) {
            // Returns a copy of the given path with any query string after the hash
            // removed.
            return path.replace(QUERY_STRING_MATCHER, '');
        };
        self._parseQueryString = function( path ) {
            var params = {}, parts, pairs, pair, i;
            parts = path.match( QUERY_STRING_MATCHER );
            if( parts ) {
                return dojo.queryToObject( parts[ 1 ] );
            }
            return params;
        };
        return init( );
    }

    return Router;

})();
