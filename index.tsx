import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Creeks: State Management Library for React
 * 
 * This library provides a versatile state management solution designed to simplify state handling in React applications.
 * It includes a flexible State class for managing state values, along with custom hooks for creating copies and watchers.
 * The library aims to enhance code modularity, reusability, and maintainability.
 *
 * @version 2.5.0
 * @license MIT
 * @author Zohayr Slileh
 * @year 2023
 * 
 * Copyright (c) Zohayr Slileh
 * 
 * https://github.com/zohayrslileh/creeks
 */

class State<Template = any> {

    /**
     * Template
     * 
     */
    public template: Template;

    /**
     * Value
     * 
     */
    public value: Template;

    /**
     * Copies
     * 
     */
    public copies: Record<number, CopyItem<Template>> = {};

    /**
     * Context
     * 
     */
    public context?: React.Context<State<Template>>;

    /**
     * Watcher
     * 
     */
    public watcher?: State<number>;


    /**
     * State constructor
     * 
     * @param template 
     */
    public constructor(template: Template) {

        // Set template and value
        this.template = template;
        this.value = template;

        // BIND METHODS
        this.createCopy = this.createCopy.bind(this)
        this.deleteCopy = this.deleteCopy.bind(this)
        this.update = this.update.bind(this)
        this.reset = this.reset.bind(this)
        this.Provider = this.Provider.bind(this)
    }

    /**
     * CREATE COPY METHOD
     * 
     * @returns
     */
    public createCopy(key: number, defaultValue: Template, dispatch: React.Dispatch<React.SetStateAction<Template>>): CopyItem<Template> {

        // Append to copies
        return this.copies[key] = {

            // Set key
            key: key,

            // Set default value
            value: defaultValue,

            // Set update method
            update: (value) => dispatch(value),

            // Set reset method
            reset: () => {

                dispatch(this.template)

                return this.copies[key];
            }
        }
    }

    /**
     * DELETE COPY METHOD
     * 
     */
    public deleteCopy(key: number) {

        delete this.copies[key];
    }

    /**
     * UPDATE METHOD
     * 
     */
    public update: UpdateMethod<Template> = (value) => {

        // Set value
        this.value = value instanceof Function ? value(this.value) : value;

        Object.values(this.copies).forEach(copy => copy.update(this.value));
    }

    /**
     * RESET METHOD
     * 
     */
    public reset(): this {

        // Set value
        this.value = this.template;

        Object.values(this.copies).forEach(copy => copy.reset());

        return this;
    }

    /**
     * PROVIDER METHOD
     * 
     * @returns 
     */
    public Provider = ({ children, value }: {
        children: any,
        value?: Template
    }) => {

        // Create context one time
        if (!this.context) this.context = createContext(new State(this.template));

        // Create provider state one time
        const state = useMemo(() => new State(value ?? this.template), [])

        return <this.context.Provider value={state}>
            {children}
        </this.context.Provider>
    }
}


/**
 * Create state method
 * 
 * @returns
 */
export function createState<Template = any>(template: Template): State<Template> {

    return new State<Template>(template);
}

/**
 * useCopy hook
 * 
 * @returns
 */
export function useCopy<This extends State>(
    state: This,
    thisValue?: This['template'],
    updateAll?: boolean
): [This['template'], CopyItem<This['template']>] {

    // Create copy state
    const [stateValue, stateDispatch] = useState(thisValue ?? state.value);

    // Generate Index
    const index = useMemo(() => Math.max(...(Object.keys(state.copies).map(Number).length ? Object.keys(state.copies).map(Number) : [0])) + 1, [])

    // Set to global state
    const copyItem = useMemo(() => state.createCopy(index, stateValue, stateDispatch), [])

    // On state value has change
    useEffect(() => {

        // Update watcher
        if (state.watcher)
            state.watcher.update(count => count + 1)

    }, [stateValue])

    // On load
    useEffect(() => {

        // Check if update all
        if (updateAll === true)
            state.update(thisValue);

        // Return delete real state
        return () => {

            // Delete from global state
            state.deleteCopy(index);

            // Update watcher
            if (state.watcher)
                state.watcher.update(count => count + 1);
        }

    }, [])

    return [stateValue, copyItem];
}

/**
 * useWatcher hook
 * 
 * @returns 
 */
export function useWatcher<This extends State>(state: This): CopyItem<This['template']>[] {

    // Create watcher one time
    if (!state.watcher) state.watcher = new State<number>(0);

    // Create watcher copy
    useCopy(state.watcher)

    return Object.values(state.copies);
}

/**
 * useProvider hook
 * 
 * @returns 
 */
export function useProvider<This extends State>(state: This): State<This['template']> {

    // Check state
    if (!state.context)
        state.context = createContext(new State(state.template));

    return useContext(state.context);
}

export default createState


/**
 * CopyItem type
 * 
 */
type CopyItem<Template> = {
    key: number,
    value: Template,
    update: UpdateMethod<Template>,
    reset: () => CopyItem<Template>
}

/**
 * Update method type
 * 
 */
type UpdateMethod<Template> = (value: Template | ((old: Template) => Template)) => void;