/**
 * Constant-time Schwarzschild lensing adapted for this line-path study.
 *
 * The texture parameterization and ray-intersection functions are derived from
 * Eric Bruneton's "Real-time High-Quality Rendering of Non-Rotating Black
 * Holes" reference implementation, copyright (c) 2020 Eric Bruneton, used
 * under its BSD 3-Clause license. See ../third_party/black_hole_shader-LICENSE.
 */

import * as THREE from 'three';

const vertexShader = /* glsl */`
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = vec4( position, 1.0 );
	}
`;

const fragmentShader = /* glsl */`
	precision highp float;

	#define PI 3.141592653589793238462643383279
	#define TAU 6.283185307179586476925286766559
	#define DEFLECTION_WIDTH 512.0
	#define DEFLECTION_HEIGHT 512.0
	#define INVERSE_RADIUS_WIDTH 64.0
	#define INVERSE_RADIUS_HEIGHT 32.0

	const float MU = 4.0 / 27.0;

	varying vec2 vUv;
	uniform vec2 uResolution;
	uniform vec3 uCameraPosition;
	uniform vec3 uCameraDirection;
	uniform vec3 uCameraUp;
	uniform vec3 uCameraVelocity;
	uniform float uFieldOfView;
	uniform float uDiskInner;
	uniform float uDiskWidth;
	uniform sampler2D uDeflectionTexture;
	uniform sampler2D uInverseRadiusTexture;

	vec3 lorentzTransformVelocity( vec3 u, vec3 v ) {
		float speedSquared = dot( v, v );
		if ( speedSquared > 0.0 ) {
			float gamma = 1.0 / sqrt( 1.0 - speedSquared );
			float denominator = 1.0 - dot( v, u );
			return ( u / gamma - v + ( gamma / ( gamma + 1.0 ) ) * dot( u, v ) * v ) / denominator;
		}
		return u;
	}

	float textureCoordinate( float value, float size ) {
		return 0.5 / size + clamp( value, 0.0, 1.0 ) * ( 1.0 - 1.0 / size );
	}

	float uApsisFromESquared( float eSquared ) {
		float x = clamp( ( 2.0 / MU ) * eSquared - 1.0, -1.0, 1.0 );
		return 1.0 / 3.0 + ( 2.0 / 3.0 ) * sin( asin( x ) / 3.0 );
	}

	float deflectionTextureU( float eSquared ) {
		if ( eSquared < MU ) {
			float ratio = clamp( eSquared / MU, 0.0, 1.0 - 1e-7 );
			return 0.5 - sqrt( max( -log( 1.0 - ratio ) / 50.0, 0.0 ) );
		}
		float ratio = clamp( MU / max( eSquared, 1e-7 ), 0.0, 1.0 - 1e-7 );
		return 0.5 + sqrt( max( -log( 1.0 - ratio ) / 50.0, 0.0 ) );
	}

	float deflectionTextureV( float eSquared, float u ) {
		if ( eSquared > MU ) {
			float x = u < 2.0 / 3.0 ? -sqrt( max( 2.0 / 3.0 - u, 0.0 ) ) : sqrt( max( u - 2.0 / 3.0, 0.0 ) );
			return ( sqrt( 2.0 / 3.0 ) + x ) / ( sqrt( 2.0 / 3.0 ) + sqrt( 1.0 / 3.0 ) );
		}
		return 1.0 - sqrt( max( 1.0 - u / max( uApsisFromESquared( eSquared ), 1e-6 ), 0.0 ) );
	}

	vec2 lookupDeflection( float eSquared, float u, out vec2 apsis ) {
		float texU = textureCoordinate( deflectionTextureU( eSquared ), DEFLECTION_WIDTH );
		float texV = textureCoordinate( deflectionTextureV( eSquared, u ), DEFLECTION_HEIGHT );
		float apsisV = textureCoordinate( 1.0, DEFLECTION_HEIGHT );
		apsis = texture2D( uDeflectionTexture, vec2( texU, apsisV ) ).rg;
		return texture2D( uDeflectionTexture, vec2( texU, texV ) ).rg;
	}

	float phiUpperBound( float eSquared ) {
		return ( 1.0 + eSquared ) / max( 1.0 / 3.0 + 2.0 * eSquared * sqrt( eSquared ), 1e-7 );
	}

	vec2 lookupInverseRadius( float eSquared, float phi ) {
		float texU = textureCoordinate( 1.0 / ( 1.0 + 6.0 * eSquared ), INVERSE_RADIUS_WIDTH );
		float texV = textureCoordinate( phi / max( phiUpperBound( eSquared ), 1e-7 ), INVERSE_RADIUS_HEIGHT );
		return texture2D( uInverseRadiusTexture, vec2( texU, texV ) ).rg;
	}

	void traceRay( float radius, float delta, float alpha, out float u0, out float phi0, out float u1, out float phi1 ) {
		float u = 1.0 / radius;
		float safeDelta = clamp( delta, 1e-5, PI - 1e-5 );
		float uDot = -u / tan( safeDelta );
		float eSquared = uDot * uDot + u * u * ( 1.0 - u );
		u0 = -1.0;
		u1 = -1.0;
		phi0 = 0.0;
		phi1 = 0.0;

		if ( eSquared < MU && u > 2.0 / 3.0 ) return;

		vec2 deflectionApsis;
		vec2 deflection = lookupDeflection( eSquared, u, deflectionApsis );
		float direction = sign( uDot );
		if ( direction == 0.0 ) direction = 1.0;
		float phi = deflection.x + ( direction == 1.0 ? PI - delta : delta ) + direction * alpha;
		float phiApsis = deflectionApsis.x + PI * 0.5;

		float firstLookupPhi = mod( phi, PI );
		vec2 first = lookupInverseRadius( eSquared, firstLookupPhi );
		if ( firstLookupPhi < phiApsis ) {
			float side = direction * ( first.x - u );
			if ( side > 1e-3 || ( side > -1e-3 && alpha < delta ) ) {
				u0 = first.x;
				phi0 = alpha + phi - firstLookupPhi;
			}
		}

		phi = 2.0 * phiApsis - phi;
		float secondLookupPhi = mod( phi, PI );
		vec2 second = lookupInverseRadius( eSquared, secondLookupPhi );
		if ( eSquared < MU && direction == 1.0 && secondLookupPhi < phiApsis ) {
			u1 = second.x;
			phi1 = alpha + phi - secondLookupPhi;
		}
	}

	vec2 diskUv( float inverseRadius, float phi, vec3 radialAxis, vec3 tangentAxis ) {
		if ( inverseRadius <= 0.0 ) return vec2( -1.0 );
		float radius = 1.0 / inverseRadius;
		// r = 3 is the innermost stable circular orbit in horizon-radius units,
		// and the reference inverse-radius table is intentionally bounded there.
		float physicalInner = max( uDiskInner, 3.0 );
		float physicalOuter = max( uDiskInner + uDiskWidth, physicalInner + 0.1 );
		if ( radius < physicalInner || radius > physicalOuter ) return vec2( -1.0 );
		vec3 intersection = ( radialAxis * cos( phi ) + tangentAxis * sin( phi ) ) * radius;
		float azimuth = mod( atan( intersection.x, intersection.z ) + TAU, TAU ) / TAU;
		float radial = 1.0 - ( radius - physicalInner ) / ( physicalOuter - physicalInner );
		return vec2( azimuth, clamp( radial, 0.0, 1.0 ) );
	}

	void main() {
		float uvFov = tan( uFieldOfView * 0.5 * PI / 180.0 );
		vec2 uv = 2.0 * ( gl_FragCoord.xy / uResolution ) - 1.0;
		uv *= vec2( uResolution.x / uResolution.y, 1.0 );

		vec3 forward = normalize( uCameraDirection );
		vec3 up = normalize( uCameraUp );
		vec3 right = normalize( cross( forward, up ) );
		up = cross( right, forward );
		vec3 pixelPosition = uCameraPosition + forward + right * uv.x * uvFov + up * uv.y * uvFov;
		vec3 rayDirection = normalize( pixelPosition - uCameraPosition );
		rayDirection = normalize( lorentzTransformVelocity( rayDirection, uCameraVelocity ) );

		vec3 radialAxis = normalize( uCameraPosition );
		vec3 rayPlaneNormal = cross( radialAxis, rayDirection );
		float rayPlaneLength = length( rayPlaneNormal );
		if ( rayPlaneLength < 1e-7 ) {
			gl_FragColor = vec4( -1.0 );
			return;
		}
		rayPlaneNormal /= rayPlaneLength;
		vec3 tangentAxis = normalize( cross( rayPlaneNormal, radialAxis ) );

		const vec3 diskNormal = vec3( 0.0, 1.0, 0.0 );
		vec3 diskAxis = cross( diskNormal, rayPlaneNormal );
		if ( length( diskAxis ) < 1e-6 ) {
			diskAxis = radialAxis - diskNormal * dot( radialAxis, diskNormal );
		}
		if ( length( diskAxis ) < 1e-6 ) {
			gl_FragColor = vec4( -1.0 );
			return;
		}
		diskAxis = normalize( diskAxis );
		if ( dot( diskAxis, tangentAxis ) < 0.0 ) diskAxis = -diskAxis;

		float alpha = acos( clamp( dot( radialAxis, diskAxis ), -1.0, 1.0 ) );
		float delta = acos( clamp( dot( radialAxis, rayDirection ), -1.0, 1.0 ) );
		float u0;
		float phi0;
		float u1;
		float phi1;
		traceRay( length( uCameraPosition ), delta, alpha, u0, phi0, u1, phi1 );

		vec2 primaryUv = diskUv( u0, phi0, radialAxis, tangentAxis );
		vec2 secondaryUv = diskUv( u1, phi1, radialAxis, tangentAxis );
		gl_FragColor = vec4( primaryUv, secondaryUv );
	}
`;

async function loadFloatTexture( relativeUrl ) {
	const response = await fetch( new URL( relativeUrl, import.meta.url ) );
	if ( ! response.ok ) throw new Error( `Unable to load ${ relativeUrl }: ${ response.status }` );
	const buffer = await response.arrayBuffer();
	const view = new DataView( buffer );
	const width = Math.round( view.getFloat32( 0, true ) );
	const height = Math.round( view.getFloat32( 4, true ) );
	const expectedLength = 8 + width * height * 2 * Float32Array.BYTES_PER_ELEMENT;
	if ( width <= 0 || height <= 0 || buffer.byteLength !== expectedLength ) {
		throw new Error( `Invalid lookup texture ${ relativeUrl }` );
	}

	const data = new Float32Array( buffer, 8 );
	const texture = new THREE.DataTexture( data, width, height, THREE.RGFormat, THREE.FloatType );
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;
	texture.generateMipmaps = false;
	texture.needsUpdate = true;
	return texture;
}

export async function loadRealismLensingTextures() {
	const [ deflectionTexture, inverseRadiusTexture ] = await Promise.all( [
		loadFloatTexture( './assets/realism/deflection.dat' ),
		loadFloatTexture( './assets/realism/inverse_radius.dat' )
	] );
	return { deflectionTexture, inverseRadiusTexture };
}

export function createRealismLensingMaterial( sharedUniforms, textures ) {
	return new THREE.ShaderMaterial( {
		vertexShader,
		fragmentShader,
		depthTest: false,
		depthWrite: false,
		uniforms: {
			uResolution: sharedUniforms.uResolution,
			uCameraPosition: sharedUniforms.uCameraPosition,
			uCameraDirection: sharedUniforms.uCameraDirection,
			uCameraUp: sharedUniforms.uCameraUp,
			uCameraVelocity: sharedUniforms.uCameraVelocity,
			uFieldOfView: sharedUniforms.uFieldOfView,
			uDiskInner: sharedUniforms.uDiskInner,
			uDiskWidth: sharedUniforms.uDiskWidth,
			uDeflectionTexture: { value: textures.deflectionTexture },
			uInverseRadiusTexture: { value: textures.inverseRadiusTexture }
		}
	} );
}
